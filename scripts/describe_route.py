#!/usr/bin/env python3
"""
describe_route.py — Generate route description data from a local GPX file.

Usage:
    python3 scripts/describe_route.py <slug>
    python3 scripts/describe_route.py trail-8k--outwood-oab

Reads public/gpx/<slug>.gpx, queries OSM and Nominatim, outputs JSON
with the terrain, features, and road names needed to write a description.

Requirements:
    pip install requests --break-system-packages
"""
import json
import re
import sys
import time
import xml.etree.ElementTree as ET
from math import radians, sin, cos, asin, sqrt
from pathlib import Path

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
OVERPASS_URL  = "https://overpass-api.de/api/interpreter"
USER_AGENT    = "RTR-RouteDescriber/1.0"
POND_CODE_RE  = re.compile(r"^[A-Z]{1,3}\d+[A-Z]?$")

GPX_DIR = Path(__file__).parent.parent / "public" / "gpx"


# ── GPX parse ─────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    return 2 * R * asin(sqrt(a))


def parse_local_gpx(slug):
    path = GPX_DIR / f"{slug}.gpx"
    if not path.exists():
        return None, f"GPX not found: {path}"

    root = ET.parse(path).getroot()
    tag  = root.tag
    ns   = tag[1:tag.index("}")] if tag.startswith("{") else ""

    def find_all(el, tag_name):
        return el.iter(f"{{{ns}}}{tag_name}") if ns else el.iter(tag_name)

    points = []
    for pt in find_all(root, "trkpt"):
        lat, lon = float(pt.get("lat")), float(pt.get("lon"))
        ele_el = next((pt.find(f"{{{n}}}ele") for n in [ns, "http://www.topografix.com/GPX/1/0"] if pt.find(f"{{{n}}}ele") is not None), pt.find("ele"))
        ele = float(ele_el.text) if ele_el is not None else None
        points.append((lat, lon, ele))

    if not points:
        return None, "No track points in GPX"

    polyline, elev_data = [], []
    dist_m = elev_gain = 0.0
    prev_ele = points[0][2]

    for i, (lat, lon, ele) in enumerate(points):
        if i > 0:
            dist_m += haversine(points[i-1][0], points[i-1][1], lat, lon)
        if ele is not None and prev_ele is not None and ele > prev_ele:
            elev_gain += ele - prev_ele
        if ele is not None:
            prev_ele = ele
        polyline.append((lat, lon))
        elev_data.append((dist_m, ele or 0.0))

    return {"polyline": polyline, "elevation": elev_data,
            "length_m": dist_m, "elev_gain_m": elev_gain}, None


# ── Terrain analysis ──────────────────────────────────────────────────────────

def elev_at_dist(elev_data, dist_m):
    lo, hi = 0, len(elev_data) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if elev_data[mid][0] < dist_m: lo = mid + 1
        else: hi = mid
    if lo == 0: return elev_data[0][1]
    d0, e0 = elev_data[lo - 1]; d1, e1 = elev_data[lo]
    t = (dist_m - d0) / (d1 - d0) if d1 != d0 else 0.0
    return e0 + t * (e1 - e0)


def analyse_terrain(elev_data, total_m):
    if not elev_data or total_m <= 0: return []
    step = 250
    samples = [(d/1000, elev_at_dist(elev_data, d)) for d in range(0, int(total_m)+step, step)]
    nodes = [samples[0]]
    for i in range(1, len(samples) - 1):
        is_peak   = samples[i][1] >= samples[i-1][1] and samples[i][1] >= samples[i+1][1]
        is_valley = samples[i][1] <= samples[i-1][1] and samples[i][1] <= samples[i+1][1]
        if (is_peak or is_valley) and abs(samples[i][1] - nodes[-1][1]) >= 4:
            nodes.append(samples[i])
    nodes.append(samples[-1])
    segments = []
    for i in range(1, len(nodes)):
        start_km, start_e = nodes[i-1]; end_km, end_e = nodes[i]
        change = end_e - start_e
        if abs(change) >= 8:
            segments.append({"start_km": round(start_km,1), "end_km": round(end_km,1),
                              "change_m": round(change), "direction": "climb" if change > 0 else "descent"})
    return segments


# ── OSM features ──────────────────────────────────────────────────────────────

def get_osm_features(bbox):
    b = f"{bbox['minlat']},{bbox['minlon']},{bbox['maxlat']},{bbox['maxlon']}"
    query = f"""[out:json][timeout:30];
(
  way["natural"="wood"]["name"]({b});
  relation["natural"="wood"]["name"]({b});
  way["landuse"="forest"]["name"]({b});
  way["leisure"="nature_reserve"]["name"]({b});
  way["leisure"="park"]["name"]({b});
  way["natural"="water"]["name"]({b});
  relation["natural"="water"]["name"]({b});
  way["highway"="footway"]["name"]({b});
  way["highway"="path"]["name"]({b});
  way["waterway"="canal"]["name"]({b});
);
out bb;
"""
    try:
        resp = requests.post(OVERPASS_URL, data={"data": query}, timeout=35,
                             headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
    except Exception as e:
        return []

    features = []
    for el in elements:
        tags = el.get("tags") or {}
        name = tags.get("name", "")
        if not name or not el.get("bounds") or POND_CODE_RE.match(name):
            continue
        b = el["bounds"]
        if   tags.get("natural") == "wood" or tags.get("landuse") == "forest": ftype = "wood"
        elif tags.get("natural") == "water":                                    ftype = tags.get("water", "water")
        elif tags.get("waterway") == "canal":                                   ftype = "canal"
        elif tags.get("leisure") in ("nature_reserve", "park"):                 ftype = tags["leisure"]
        elif tags.get("highway"):                                                ftype = "path"
        else:                                                                    ftype = "area"
        features.append({"name": name, "type": ftype, "bounds": b})
    return features


def cross_reference_route(polyline, features, total_km):
    total_pts = len(polyline)
    result = []
    for feat in features:
        b = feat["bounds"]
        hits = [i for i, (lat, lon) in enumerate(polyline)
                if b["minlat"] <= lat <= b["maxlat"] and b["minlon"] <= lon <= b["maxlon"]]
        if len(hits) < 2: continue
        result.append({**feat, "first_km": round(hits[0]/total_pts*total_km,1),
                       "last_km": round(hits[-1]/total_pts*total_km,1)})
    result.sort(key=lambda x: x["first_km"])
    return result


# ── Road names ────────────────────────────────────────────────────────────────

def get_road_names(polyline, total_km, step_km=0.6):
    total_pts = len(polyline)
    step_pts  = max(1, int(step_km / total_km * total_pts))
    results, last_road = [], None
    for idx in range(0, total_pts, step_pts):
        lat, lon  = polyline[idx]
        approx_km = round(idx / total_pts * total_km, 1)
        try:
            resp = requests.get(NOMINATIM_URL,
                                params={"lat": f"{lat:.6f}", "lon": f"{lon:.6f}",
                                        "format": "json", "zoom": 18},
                                timeout=15, headers={"User-Agent": USER_AGENT, "Accept-Language": "en"})
            resp.raise_for_status()
            addr   = resp.json().get("address", {})
            road   = (addr.get("road") or addr.get("footway") or addr.get("path")
                      or addr.get("cycleway") or addr.get("pedestrian") or "")
            suburb = addr.get("suburb") or addr.get("neighbourhood") or ""
        except Exception:
            road, suburb = "", ""
        if road and road != last_road:
            results.append({"approx_km": approx_km, "road": road, "suburb": suburb})
            last_road = road
        time.sleep(0.3)
    return results


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: describe_route.py <slug>"}))
        sys.exit(1)

    slug = sys.argv[1].strip()
    print(f"Fetching data for: {slug}", file=sys.stderr)

    gpx, err = parse_local_gpx(slug)
    if err:
        print(json.dumps({"error": err})); sys.exit(1)

    polyline = gpx["polyline"]
    total_km = gpx["length_m"] / 1000

    lats = [p[0] for p in polyline]; lons = [p[1] for p in polyline]
    bbox = {"minlat": min(lats)-0.002, "maxlat": max(lats)+0.002,
            "minlon": min(lons)-0.002, "maxlon": max(lons)+0.002}

    print("Analysing terrain...", file=sys.stderr)
    terrain = analyse_terrain(gpx["elevation"], gpx["length_m"])

    print("Querying OSM features...", file=sys.stderr)
    features = get_osm_features(bbox)
    features_on_route = cross_reference_route(polyline, features, total_km)

    print("Geocoding road names (this takes ~30s)...", file=sys.stderr)
    road_names = get_road_names(polyline, total_km)

    print(json.dumps({
        "slug":            slug,
        "distance_km":     round(total_km, 2),
        "elev_gain_m":     round(gpx["elev_gain_m"]),
        "terrain":         terrain,
        "features_on_route": [{"name": f["name"], "type": f["type"],
                                "first_km": f["first_km"], "last_km": f["last_km"]}
                               for f in features_on_route],
        "road_names":      road_names,
    }, indent=2))


if __name__ == "__main__":
    main()
