#!/usr/bin/env python3
"""
describe_route.py - Generate route description data from a local GPX file.

Usage:
    python3 scripts/describe_route.py <slug>
    python3 scripts/describe_route.py road-8k--rnr-bury-nr-dumers

Reads public/gpx/<slug>.gpx, queries OpenStreetMap (Overpass) once, and
prints JSON with everything needed to write a route description:

  terrain           climbs and descents (>= 8 m) with where they happen
  surface           metres on roads vs paths/tracks, and the path share
  streets           the street-by-street sequence the route actually runs on,
                    with highway type and length (stretches >= 60 m)
  path_stretches    named paths/towpaths/tracks the route runs ALONG for
                    >= 150 m - "the feature IS the route" (e.g. Banana Path)
  features_on_route parks, woods, reserves, water and the canal the route
                    runs INSIDE or ALONGSIDE for >= 200 m
  features_passed   ones it only skirts or crosses (< 200 m). Never describe
                    these as the route going "through" or "along" them.

WHY IT WORKS THIS WAY (Oct 2026). The first version counted a feature as "on
route" whenever the route entered the feature's bounding RECTANGLE. A canal's
rectangle covers half the district and a park's rectangle covers the road
beside it, so road routes picked up parks they only pass and a towpath they
only cross on a bridge - and every road-season description written from that
output said so. Matching is now against each feature's real geometry, with
the metres involved, and the street sequence comes from snapping the GPS
track to mapped streets every 20 m rather than sparse reverse-geocoding.

Writing rule (Paul, 11 Oct 2026): road-season routes describe the route - the
streets, climbs and descents - not the features beside it. Name a feature
only when it IS the route (path_stretches, or features_on_route).

The script FAILS LOUDLY (non-zero exit) if Overpass cannot be reached after
retries: an empty feature list must never be mistaken for a route that has
none.

Requirements:
    pip install requests --break-system-packages
"""
import json
import math
import re
import sys
import time
import xml.etree.ElementTree as ET
from math import radians, sin, cos, asin, sqrt
from pathlib import Path

import requests

# Public Overpass servers, tried in turn. They are free and busy: 504s and
# 500s are routine, so a run retries across them before giving up.
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
USER_AGENT   = "RTR-RouteDescriber/2.0"
POND_CODE_RE = re.compile(r"^[A-Z]{1,3}\d+[A-Z]?$")

GPX_DIR = Path(__file__).parent.parent / "public" / "gpx"

SAMPLE_M        = 20    # route resampling step
SNAP_M          = 20    # max distance from a street to count as on it
ALONG_M         = 15    # max distance from a canal/path to count as alongside
MIN_STREET_M    = 60    # shortest street stretch worth listing
MIN_PATH_M      = 150   # shortest path stretch that counts as part of the route
MIN_FEATURE_M   = 200   # inside/alongside a feature for at least this to be "on route"

PATH_TYPES = {"footway", "path", "cycleway", "bridleway", "track", "steps", "pedestrian"}


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


# ── Geometry helpers (local metres, good to a few metres at this scale) ──────

def to_xy(lat, lon, lat0):
    return (lon * 111320 * math.cos(math.radians(lat0)), lat * 110540)


def seg_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    L = dx*dx + dy*dy
    t = 0 if L == 0 else max(0.0, min(1.0, ((px-ax)*dx + (py-ay)*dy) / L))
    return math.hypot(px - (ax + t*dx), py - (ay + t*dy))


def line_dist(p, pts):
    return min(seg_dist(p, pts[i], pts[i+1]) for i in range(len(pts) - 1))


def point_in_ring(p, ring):
    x, y = p; inside = False
    for i in range(len(ring)):
        (x1, y1), (x2, y2) = ring[i], ring[(i + 1) % len(ring)]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def bbox_of(pts, pad):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)


def in_bbox(p, bb):
    return bb[0] <= p[0] <= bb[2] and bb[1] <= p[1] <= bb[3]


# ── OpenStreetMap ─────────────────────────────────────────────────────────────

def overpass(query):
    last = None
    for attempt in range(6):
        url = OVERPASS_URLS[attempt % len(OVERPASS_URLS)]
        try:
            r = requests.post(url, data={"data": query}, timeout=120,
                              headers={"User-Agent": USER_AGENT})
            if r.status_code == 200 and r.headers.get("content-type", "").startswith("application/json"):
                return r.json().get("elements", [])
            last = f"HTTP {r.status_code} from {url}"
        except Exception as e:
            last = f"{type(e).__name__} from {url}"
        time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"Overpass unreachable after retries ({last})")


def fetch_osm(polyline):
    lats = [p[0] for p in polyline]; lons = [p[1] for p in polyline]
    b = f"{min(lats)-0.002},{min(lons)-0.002},{max(lats)+0.002},{max(lons)+0.002}"
    query = f"""[out:json][timeout:90];
(
  way["highway"]({b});
  way["natural"="wood"]["name"]({b});
  relation["natural"="wood"]["name"]({b});
  way["landuse"="forest"]["name"]({b});
  way["leisure"~"^(park|nature_reserve)$"]["name"]({b});
  relation["leisure"~"^(park|nature_reserve)$"]["name"]({b});
  way["natural"="water"]["name"]({b});
  relation["natural"="water"]["name"]({b});
  way["waterway"="canal"]({b});
);
out geom tags;
"""
    return overpass(query)


def classify(el):
    """('street', highway, surface) | ('area', type) | ('line', type) | None"""
    t = el.get("tags") or {}
    if t.get("highway"):
        if t["highway"] in ("proposed", "construction", "platform", "bus_stop"):
            return None
        return ("street", t["highway"], t.get("surface", ""))
    if t.get("waterway") == "canal":
        return ("line", "canal")
    if t.get("natural") == "wood" or t.get("landuse") == "forest":
        return ("area", "wood")
    if t.get("natural") == "water":
        return ("area", t.get("water", "water"))
    if t.get("leisure") in ("park", "nature_reserve"):
        return ("area", t["leisure"])
    return None


def geometries(el, lat0):
    """Lists of point lists in local metres: one per way, or per outer member."""
    if el["type"] == "way" and el.get("geometry"):
        return [[to_xy(n["lat"], n["lon"], lat0) for n in el["geometry"]]]
    if el["type"] == "relation":
        out = []
        for m in el.get("members", []):
            if m.get("role") in ("outer", "") and m.get("geometry"):
                out.append([to_xy(n["lat"], n["lon"], lat0) for n in m["geometry"]])
        return out
    return []


# ── Route analysis ────────────────────────────────────────────────────────────

def resample(polyline, lat0):
    pts, acc, nxt = [], 0.0, 0.0
    for i, (lat, lon) in enumerate(polyline):
        if i:
            acc += haversine(polyline[i-1][0], polyline[i-1][1], lat, lon)
        if acc >= nxt:
            pts.append((acc, to_xy(lat, lon, lat0)))
            nxt += SAMPLE_M
    return pts


def runs_of(flags, samples):
    """Collapse per-sample booleans into [first_m, last_m, metres] runs."""
    runs, cur = [], None
    for ok, (m, _) in zip(flags, samples):
        if ok:
            if cur is None: cur = [m, m]
            else: cur[1] = m
        elif cur is not None:
            runs.append(cur); cur = None
    if cur is not None: runs.append(cur)
    return [(a, b, b - a + SAMPLE_M) for a, b in runs]


def analyse_route(polyline, elements):
    lat0 = polyline[0][0]
    samples = resample(polyline, lat0)

    streets, areas, lines = [], [], []
    for el in elements:
        kind = classify(el)
        if not kind:
            continue
        geoms = [g for g in geometries(el, lat0) if len(g) >= 2]
        if not geoms:
            continue
        name = (el.get("tags") or {}).get("name", "")
        if kind[0] == "street":
            label = name or (el.get("tags") or {}).get("ref") or f"unnamed {kind[1]}"
            for g in geoms:
                streets.append((label, kind[1], kind[2], g, bbox_of(g, SNAP_M)))
        elif name and not POND_CODE_RE.match(name):
            entry = {"name": name, "type": kind[1], "geoms": geoms,
                     "bbox": bbox_of([p for g in geoms for p in g], ALONG_M)}
            (areas if kind[0] == "area" else lines).append(entry)

    # Street sequence: nearest street within SNAP_M at each sample.
    seq = []
    for m, p in samples:
        best = None
        for label, hw, surf, g, bb in streets:
            if not in_bbox(p, bb):
                continue
            d = line_dist(p, g)
            if d <= SNAP_M and (best is None or d < best[0]):
                best = (d, label, hw, surf)
        key = (best[1], best[2]) if best else ("(no mapped way)", "")
        if seq and seq[-1]["key"] == key:
            seq[-1]["to"] = m
        else:
            seq.append({"key": key, "surface": best[3] if best else "", "from": m, "to": m})

    total = samples[-1][0] if samples else 0.0
    road_m = path_m = 0.0
    street_out = []
    for s in seq:
        length = s["to"] - s["from"] + SAMPLE_M
        name, hw = s["key"]
        if hw in PATH_TYPES: path_m += length
        elif hw: road_m += length
        if length < MIN_STREET_M:
            continue
        row = {"from_km": round(s["from"]/1000, 1), "to_km": round(s["to"]/1000, 1),
               "metres": round(length), "highway": hw, "name": name}
        if s["surface"]: row["surface"] = s["surface"]
        prev = street_out[-1] if street_out else None
        if prev and prev["name"] == name and (prev["highway"] in PATH_TYPES) == (hw in PATH_TYPES):
            # Same street resumed after a short gap (a junction, a side
            # turning): one stretch, not two.
            prev["to_km"] = row["to_km"]; prev["metres"] += row["metres"]
        else:
            street_out.append(row)

    # Judged AFTER merging, so a path mapped as several short ways (common
    # for pavements and cut-throughs) still counts at its full length.
    path_stretches = [r for r in street_out
                      if r["highway"] in PATH_TYPES and r["metres"] >= MIN_PATH_M]

    # Features: metres of route inside (areas) or alongside (lines).
    on_route, passed = [], []
    for f in areas + lines:
        flags = []
        for _, p in samples:
            if not in_bbox(p, f["bbox"]):
                flags.append(False); continue
            if f in areas:
                hit = any(point_in_ring(p, g) for g in f["geoms"] if len(g) >= 3) \
                      or any(line_dist(p, g) <= 5 for g in f["geoms"])
            else:
                hit = any(line_dist(p, g) <= ALONG_M for g in f["geoms"])
            flags.append(hit)
        runs = runs_of(flags, samples)
        if not runs:
            continue
        metres = sum(r[2] for r in runs)
        row = {"name": f["name"], "type": f["type"],
               "relation": "inside" if f in areas else "alongside",
               "metres": round(metres),
               "first_km": round(runs[0][0]/1000, 1), "last_km": round(runs[-1][1]/1000, 1)}
        (on_route if metres >= MIN_FEATURE_M else passed).append(row)

    # Merge duplicate names (e.g. a canal mapped as several ways).
    def merge(rows):
        out = {}
        for r in rows:
            k = (r["name"], r["type"])
            if k in out:
                o = out[k]; o["metres"] += r["metres"]
                o["first_km"] = min(o["first_km"], r["first_km"]); o["last_km"] = max(o["last_km"], r["last_km"])
            else:
                out[k] = dict(r)
        return sorted(out.values(), key=lambda r: r["first_km"])

    surface = {"road_m": round(road_m), "path_m": round(path_m),
               "path_share": round(path_m / total, 2) if total else 0.0}
    return street_out, path_stretches, merge(on_route), merge(passed), surface


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

    print("Analysing terrain...", file=sys.stderr)
    terrain = analyse_terrain(gpx["elevation"], gpx["length_m"])

    print("Querying OpenStreetMap...", file=sys.stderr)
    try:
        elements = fetch_osm(polyline)
    except RuntimeError as e:
        print(json.dumps({"error": str(e)})); sys.exit(2)

    print("Matching route to streets and features...", file=sys.stderr)
    streets, path_stretches, on_route, passed, surface = analyse_route(polyline, elements)

    print(json.dumps({
        "slug":              slug,
        "distance_km":       round(gpx["length_m"] / 1000, 2),
        "elev_gain_m":       round(gpx["elev_gain_m"]),
        "terrain":           terrain,
        "surface":           surface,
        "streets":           streets,
        "path_stretches":    path_stretches,
        "features_on_route": on_route,
        "features_passed":   passed,
    }, indent=2))


if __name__ == "__main__":
    main()
