#!/usr/bin/env python3
"""
RTR Route Map Generator
=======================
Renders each GPX route as a branded map image for use on the radcliffe.run website.

Output: public/route-maps/{slug}.webp        (800x450px, RTR dark theme)
        public/route-maps/light/{slug}.webp  (800x450px, RTR light theme)

Usage:
    # Generate ALL routes - dark theme (skips existing by default)
    python3 scripts/generate_route_maps.py

    # Generate ALL routes - light theme
    python3 scripts/generate_route_maps.py --theme light

    # Generate specific slugs
    python3 scripts/generate_route_maps.py trail-8k--outwood-oab road-5k--oab-to-bury

    # Force regenerate (overwrite existing)
    python3 scripts/generate_route_maps.py --force

    # Limit to N routes (for testing)
    python3 scripts/generate_route_maps.py --limit 4

Requirements:
    pip install staticmap Pillow --break-system-packages
"""

import sys
import math
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    from staticmap import StaticMap, Line
    from PIL import Image, ImageEnhance, ImageFilter, ImageFont, ImageDraw
except ImportError:
    print("Missing dependencies. Run:")
    print("  pip install staticmap Pillow --break-system-packages")
    sys.exit(1)

# ── Paths (relative to this script's parent = project root) ──────────────────
SCRIPT_DIR  = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
GPX_DIR     = PROJECT_DIR / "public" / "gpx"
OUT_DIR     = PROJECT_DIR / "public" / "route-maps"
ASSETS_DIR  = Path(__file__).parent.parent.parent.parent / ".claude" / "skills" / "rtr-branding" / "assets"

# ── Output image size ─────────────────────────────────────────────────────────
WIDTH  = 800
HEIGHT = 450

# ── Map style ─────────────────────────────────────────────────────────────────
TILE_URL   = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"  # OSM standard

# Dark theme post-processing
DARK_BRIGHTNESS = 0.42    # Darken the basemap
DARK_CONTRAST   = 1.5     # Increase contrast after darkening
DARK_TINT_RGBA  = (70, 32, 0, 65)  # Warm amber tint overlay

# Light theme post-processing
LIGHT_BRIGHTNESS = 0.96   # Very slight dim to soften the white basemap
LIGHT_CONTRAST   = 1.05   # Very subtle contrast boost
LIGHT_TINT_RGBA  = (255, 250, 240, 18)  # Barely-there warm tint

# Route line (three-layer glow effect) - same for both themes
LINE_DARK   = "#7a4800"   # Glow / underline
LINE_ORANGE = "#f5a623"   # Main RTR orange
LINE_LIGHT  = "#ffd280"   # Highlight on top

LINE_W_DARK   = 10
LINE_W_ORANGE = 5
LINE_W_LIGHT  = 2

# Brand colours
ORANGE = (245, 166, 35)
WHITE  = (255, 255, 255)
DARK   = (10, 10, 10)

# ── Auto zoom ─────────────────────────────────────────────────────────────────

def best_zoom(coords: list[tuple[float, float]], width: int = WIDTH, height: int = HEIGHT) -> int:
    """Return the highest zoom level that fits the full route with ~30% padding."""
    lats = [c[1] for c in coords]
    lons = [c[0] for c in coords]
    lat_span = max(lats) - min(lats)
    lon_span = max(lons) - min(lons)
    if lat_span == 0 and lon_span == 0:
        return 14

    mean_lat  = sum(lats) / len(lats)
    padding   = 1.30  # 30% breathing room
    cos_lat   = math.cos(math.radians(mean_lat))
    lat_m     = lat_span * 111_320 * padding
    lon_m     = lon_span * 111_320 * cos_lat * padding

    for z in range(14, 9, -1):
        # metres per pixel at this zoom and latitude
        mpp = 156_543 * cos_lat / (2 ** z)
        if (lon_m / mpp if lon_m > 0 else 0) <= width and \
           (lat_m / mpp if lat_m > 0 else 0) <= height:
            return z
    return 10


# ── GPX parsing ───────────────────────────────────────────────────────────────

NS = {
    "gpx":  "http://www.topografix.com/GPX/1/1",
    "gpx10": "http://www.topografix.com/GPX/1/0",
}

def parse_gpx(path: Path) -> list[tuple[float, float]]:
    """Extract (lon, lat) coordinate list from a GPX file."""
    tree = ET.parse(path)
    root = tree.getroot()

    # Detect namespace
    tag = root.tag  # e.g. "{http://www.topografix.com/GPX/1/1}gpx"
    ns = ""
    if tag.startswith("{"):
        ns = tag[1:tag.index("}")]

    def find_all(element, tag_name):
        if ns:
            return element.iter(f"{{{ns}}}{tag_name}")
        return element.iter(tag_name)

    coords = []
    for trkpt in find_all(root, "trkpt"):
        lat = float(trkpt.get("lat"))
        lon = float(trkpt.get("lon"))
        coords.append((lon, lat))

    # Fallback to rtept (route points)
    if not coords:
        for rtept in find_all(root, "rtept"):
            lat = float(rtept.get("lat"))
            lon = float(rtept.get("lon"))
            coords.append((lon, lat))

    return coords


# ── Map rendering ─────────────────────────────────────────────────────────────

def render_map(coords: list[tuple[float, float]], zoom: int = 14) -> Image.Image:
    """Render tile-based map with route overlay, return as PIL Image."""
    m = StaticMap(WIDTH, HEIGHT, url_template=TILE_URL)

    # Three-layer route line: glow → main → highlight
    m.add_line(Line(coords, LINE_DARK,   LINE_W_DARK))
    m.add_line(Line(coords, LINE_ORANGE, LINE_W_ORANGE))
    m.add_line(Line(coords, LINE_LIGHT,  LINE_W_LIGHT))

    img = m.render(zoom=zoom)
    return img


def postprocess(img: Image.Image, theme: str = "dark") -> Image.Image:
    """Apply RTR styling: desaturate, darken/lighten, contrast boost, tint."""
    if theme == "light":
        # Light theme: keep natural colours, very subtle adjustments only
        # 1. Light desaturate (keep 40% colour for a muted map feel)
        grey = img.convert("L").convert("RGB")
        img  = Image.blend(img, grey, alpha=0.40)

        # 2. Slight dim
        img = ImageEnhance.Brightness(img).enhance(LIGHT_BRIGHTNESS)

        # 3. Subtle contrast
        img = ImageEnhance.Contrast(img).enhance(LIGHT_CONTRAST)

        # 4. Barely-there warm tint
        tint = Image.new("RGBA", img.size, LIGHT_TINT_RGBA)
        img  = Image.alpha_composite(img.convert("RGBA"), tint).convert("RGB")
    else:
        # Dark theme: desaturate heavily, darken, amber tint
        # 1. Desaturate (convert to greyscale, blend back 20% colour)
        grey = img.convert("L").convert("RGB")
        img  = Image.blend(img, grey, alpha=0.85)

        # 2. Darken
        img = ImageEnhance.Brightness(img).enhance(DARK_BRIGHTNESS)

        # 3. Contrast
        img = ImageEnhance.Contrast(img).enhance(DARK_CONTRAST)

        # 4. Amber tint overlay
        tint = Image.new("RGBA", img.size, DARK_TINT_RGBA)
        img  = Image.alpha_composite(img.convert("RGBA"), tint).convert("RGB")

    return img


def add_label(img: Image.Image, label: str = "THE ROUTE") -> Image.Image:
    """Add 'THE ROUTE' label in Inter Medium (or fallback) at top-left."""
    draw = ImageDraw.Draw(img)

    # Try to load Inter Medium from the rtr-branding skill assets
    font = None
    font_candidates = [
        ASSETS_DIR / "Inter-Medium.ttf",
        Path("/usr/share/fonts/truetype/lato/Lato-Regular.ttf"),
    ]
    for fc in font_candidates:
        if fc.exists():
            try:
                font = ImageFont.truetype(str(fc), 18)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    x, y = 16, 16

    # Subtle dark backing pill
    bbox = draw.textbbox((x, y), label, font=font)
    pad = 6
    draw.rounded_rectangle(
        [bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad],
        radius=4,
        fill=(10, 10, 10, 180) if img.mode == "RGBA" else (10, 10, 10),
    )

    draw.text((x, y), label, font=font, fill=ORANGE)
    return img


def generate_map(gpx_path: Path, out_path: Path, theme: str = "dark") -> bool:
    """Generate one map image. Returns True on success."""
    slug = gpx_path.stem
    try:
        coords = parse_gpx(gpx_path)
        if len(coords) < 2:
            print(f"  ⚠  {slug}: too few coordinates ({len(coords)}), skipped")
            return False

        zoom = best_zoom(coords)
        img = render_map(coords, zoom=zoom)
        img = postprocess(img, theme=theme)

        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(out_path), "WEBP", quality=85)
        print(f"  ✓  {slug} → {out_path.name}")
        return True

    except Exception as e:
        print(f"  ✗  {slug}: {e}")
        return False


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate RTR route map images from GPX files")
    parser.add_argument("slugs", nargs="*", help="Specific slug(s) to generate (omit for all)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing images")
    parser.add_argument("--limit", type=int, default=0, help="Limit to N files (for testing)")
    parser.add_argument("--theme", choices=["dark", "light"], default="dark",
                        help="Map theme: 'dark' (default) or 'light' (outputs to route-maps/light/)")
    args = parser.parse_args()

    # Light theme outputs to a subdirectory
    out_dir = OUT_DIR / "light" if args.theme == "light" else OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    # Build file list
    if args.slugs:
        gpx_files = []
        for slug in args.slugs:
            p = GPX_DIR / f"{slug}.gpx"
            if not p.exists():
                print(f"  ⚠  GPX not found: {p}")
            else:
                gpx_files.append(p)
    else:
        gpx_files = sorted(GPX_DIR.glob("*.gpx"))

    if args.limit:
        gpx_files = gpx_files[:args.limit]

    total = len(gpx_files)
    print(f"\nRTR Route Map Generator")
    print(f"  Source:  {GPX_DIR}")
    print(f"  Output:  {out_dir}")
    print(f"  Theme:   {args.theme}")
    print(f"  Size:    {WIDTH}x{HEIGHT}px")
    print(f"  Routes:  {total}\n")

    ok = skipped = failed = 0
    for gpx_path in gpx_files:
        out_path = out_dir / f"{gpx_path.stem}.webp"
        if out_path.exists() and not args.force:
            print(f"  -  {gpx_path.stem} (already exists, use --force to regenerate)")
            skipped += 1
            continue
        if generate_map(gpx_path, out_path, theme=args.theme):
            ok += 1
        else:
            failed += 1

    print(f"\nDone - {ok} generated, {skipped} skipped, {failed} failed")


if __name__ == "__main__":
    main()
