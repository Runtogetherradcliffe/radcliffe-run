"""Run Together Radcliffe - Couch to 5K motion promo.

Renders one 1080x1330 "stage" per frame (at 2x, downsampled) and composites it
onto a 4:5 (1080x1350) and a 9:16 (1080x1920) background. The 9:16 safe area
(y 250..1580) is exactly 1330 tall, so both cuts share the same composition.

Social media asset only - nothing on the site uses it. Copy is checked against
the C25K brief (Oct 2026): the course builds to 30 minutes non-stop; the 5K is
the graduation parkrun at Heaton Park, at your own pace. Do not reword it as
"5K in 30 minutes". When the January 2027 start date is set, change
"Starts January 2027" in scene_end and re-render.

Needs ffmpeg via imageio-ffmpeg (no system ffmpeg required):
  python3 -m venv /tmp/c25k-venv
  /tmp/c25k-venv/bin/pip install imageio-ffmpeg pillow numpy
  /tmp/c25k-venv/bin/python scripts/c25k_promo.py out/c25k-promo

Usage: python c25k_promo.py <out_dir> [--stills t1,t2,...]
  --stills renders PNGs at the given times (seconds) instead of the MP4s.
  out/ is gitignored, so renders never get committed.
"""
import math
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path("/Users/paulcox/Dev for radcliffe run/radcliffe-run")
FONTS = REPO / "public" / "fonts"
LOGO = REPO / "public" / "logo.png"

FPS = 30
DURATION = 30.0
SS = 2  # supersample factor
SW, SH = 1080, 1330  # stage, 1x

PURPLE = (218, 130, 218)
ORANGE = (245, 166, 35)
WHITE = (255, 255, 255)
GREY = (176, 162, 176)
DIM = (120, 104, 120)
WALK = (78, 66, 78)
BG_TOP = (15, 6, 15)
BG_BOT = (22, 12, 22)
CARD = (33, 20, 33)
INK = (15, 6, 15)

_font_cache = {}


def font(weight, size):
    key = (weight, size)
    if key not in _font_cache:
        name = {
            300: "Inter-Light.ttf",
            400: "Inter-Regular.ttf",
            500: "Inter-Medium.ttf",
            700: "Inter-Bold.ttf",
            800: "Inter-ExtraBold.ttf",
        }[weight]
        _font_cache[key] = ImageFont.truetype(str(FONTS / name), size * SS)
    return _font_cache[key]


# ---------- easing / timing ----------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def enter(t, start, dur=0.55):
    """0..1 progress of an entrance starting at `start` (scene-local seconds)."""
    return ease_out((t - start) / dur)


# ---------- drawing primitives (all coordinates at 1x) ----------

class Stage:
    def __init__(self):
        self.img = Image.new("RGBA", (SW * SS, SH * SS), (0, 0, 0, 0))

    def layer(self, alpha, fn):
        """Draw fn(draw) on its own layer, composited at `alpha`."""
        if alpha <= 0.003:
            return
        if alpha >= 0.997:
            fn(ImageDraw.Draw(self.img))
            return
        lay = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
        fn(ImageDraw.Draw(lay))
        a = lay.getchannel("A").point(lambda v: int(v * alpha))
        lay.putalpha(a)
        self.img.alpha_composite(lay)

    def paste(self, im, alpha, x, y):
        if alpha <= 0.003:
            return
        if alpha < 0.997:
            im = im.copy()
            im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
        self.img.alpha_composite(im, (int(x * SS), int(y * SS)))

    def final(self):
        return self.img.resize((SW, SH), Image.LANCZOS)


def s(v):
    return int(round(v * SS))


def text(d, x, y, txt, weight, size, fill, anchor="ma"):
    d.text((s(x), s(y)), txt, font=font(weight, size), fill=fill, anchor=anchor)


def text_width(txt, weight, size):
    return font(weight, size).getlength(txt) / SS


def rrect(d, box, r, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = box
    if x1 - x0 < 1:
        return
    r = min(r, (x1 - x0) / 2, (y1 - y0) / 2)
    d.rounded_rectangle([s(x0), s(y0), s(x1), s(y1)], radius=s(r), fill=fill,
                        outline=outline, width=s(width) if outline else 0)


def rise_text(st, t, start, x, y, txt, weight, size, fill, anchor="ma", rise=36):
    p = enter(t, start)
    st.layer(p, lambda d: text(d, x, y + (1 - p) * rise, txt, weight, size, fill, anchor))


# ---------- assets ----------

def load_logo(size):
    im = Image.open(LOGO).convert("RGBA")
    return im.resize((s(size), s(size)), Image.LANCZOS)


LOGO_SMALL = load_logo(60)
LOGO_BIG = load_logo(200)


# ---------- persistent header ----------

def header(st, alpha):
    def fn(d):
        title = "Run Together Radcliffe"
        tag = "Couch to 5K"
        gap = 18
        w = 60 + gap + text_width(title, 700, 30) + 16 + text_width(tag, 700, 30)
        x0 = (SW - w) / 2
        y = 46
        text(d, x0 + 60 + gap, y + 30, title, 700, 30, WHITE, anchor="lm")
        text(d, x0 + 60 + gap + text_width(title, 700, 30) + 16, y + 30, tag, 700, 30,
             PURPLE, anchor="lm")
    st.layer(alpha, fn)
    title_w = 60 + 18 + text_width("Run Together Radcliffe", 700, 30) + 16 + \
        text_width("Couch to 5K", 700, 30)
    st.paste(LOGO_SMALL, alpha, (SW - title_w) / 2, 46)


# ---------- scenes (t is scene-local seconds) ----------

def couch(d, cx, cy, sc=1.0):
    def b(x0, y0, x1, y1):
        return (cx + x0 * sc, cy + y0 * sc, cx + x1 * sc, cy + y1 * sc)
    back = (74, 44, 74)
    seat = (96, 58, 96)
    arm = (86, 52, 86)
    rrect(d, b(-170, -120, 170, 20), 42 * sc, fill=back)
    rrect(d, b(-200, -10, 200, 70), 30 * sc, fill=seat)
    rrect(d, b(-196, -10, -4, 14), 12 * sc, fill=(112, 70, 112))
    rrect(d, b(4, -10, 196, 14), 12 * sc, fill=(112, 70, 112))
    rrect(d, b(-240, -60, -170, 90), 34 * sc, fill=arm)
    rrect(d, b(170, -60, 240, 90), 34 * sc, fill=arm)
    rrect(d, b(-200, 88, -180, 122), 6 * sc, fill=back)
    rrect(d, b(180, 88, 200, 122), 6 * sc, fill=back)


def scene_couch(st, t):
    p = enter(t, 0.0, 0.7)
    bob = math.sin(t * 2.2) * 4
    st.layer(p, lambda d: couch(d, SW / 2, 520 + (1 - p) * 40 + bob, 1.15))
    rise_text(st, t, 0.35, SW / 2, 780, "Never run before?", 800, 96, WHITE)
    rise_text(st, t, 0.95, SW / 2, 900, "Or not for years?", 800, 96, PURPLE)
    rise_text(st, t, 1.7, SW / 2, 1060, "This is for you.", 500, 50, GREY)


def interval_strip(d, x0, x1, y, h, prog):
    """Week 1: 8 x (60s jog, 90s walk). prog 0..1 fills left to right."""
    total = 8 * 150
    gap = 6
    width = x1 - x0 - gap * 15
    fill_to = prog * total
    acc = 0
    x = x0
    for i in range(16):
        dur = 60 if i % 2 == 0 else 90
        w = width * dur / total
        rrect(d, (x, y, x + w, y + h), 10, fill=(44, 32, 44))
        shown = clamp((fill_to - acc) / dur)
        if shown > 0:
            rrect(d, (x, y, x + w * shown, y + h), 10,
                  fill=ORANGE if i % 2 == 0 else WALK)
        acc += dur
        x += w + gap


def scene_week1(st, t):
    rise_text(st, t, 0.0, SW / 2, 330, "WEEK 1", 800, 40, PURPLE)
    rise_text(st, t, 0.15, SW / 2, 400, "Your first", 800, 104, WHITE)
    rise_text(st, t, 0.3, SW / 2, 520, "60-second jog.", 800, 104, WHITE)
    a = enter(t, 0.6)
    prog = ease_in_out((t - 0.8) / 1.8)
    st.layer(a, lambda d: interval_strip(d, 90, 990, 720, 70, prog))

    def legend(d):
        y = 840
        rrect(d, (250, y, 284, y + 34), 8, fill=ORANGE)
        text(d, 298, y + 17, "60s jog", 500, 36, WHITE, anchor="lm")
        rrect(d, (540, y, 574, y + 34), 8, fill=WALK)
        text(d, 588, y + 17, "90s walk  x8", 500, 36, WHITE, anchor="lm")
    st.layer(enter(t, 0.9), legend)
    rise_text(st, t, 1.5, SW / 2, 970, "Every session starts with a 5-min", 500, 38, GREY)
    rise_text(st, t, 1.5, SW / 2, 1020, "warm-up walk and ends with a cool-down.", 500, 38,
              GREY)


RUN_SHARE = [.43, .47, .60, .74, .74, .76, .87, .71, .74, .75]
MILESTONES = [  # (from week index, text)
    (0, "Week 1 - 60 seconds of jogging"),
    (2, "Week 3 - your first 3-minute run"),
    (5, "Week 6 - your first 20-minute run"),
    (7, "Week 8 - 25 minutes non-stop"),
    (9, "Week 10 - 30 minutes non-stop"),
]
ROW_START = 1.2
ROW_STEP = 0.9


def scene_weeks(st, t):
    rise_text(st, t, 0.0, SW / 2, 170, "10 weeks.", 800, 96, WHITE)
    rise_text(st, t, 0.15, SW / 2, 280, "One step at a time.", 800, 72, PURPLE)

    def legend(d):
        y = 400
        rrect(d, (330, y, 362, y + 32), 8, fill=ORANGE)
        text(d, 376, y + 16, "Run", 500, 34, WHITE, anchor="lm")
        rrect(d, (560, y, 592, y + 32), 8, fill=WALK)
        text(d, 606, y + 16, "Walk", 500, 34, WHITE, anchor="lm")
    st.layer(enter(t, 0.35), legend)

    current = int(clamp((t - ROW_START) / ROW_STEP, 0, 9.999))
    top, row_h, bar_h = 480, 58, 40
    bx0, bx1 = 200, 980
    for i, share in enumerate(RUN_SHARE):
        start = ROW_START + i * ROW_STEP
        a = enter(t, start - 0.1, 0.35)
        grow = ease_out((t - start) / 0.6)
        y = top + i * row_h
        is_cur = i == current and t < ROW_START + 10 * ROW_STEP + 0.4
        last = i == 9

        def fn(d, y=y, share=share, grow=grow, i=i, is_cur=is_cur, last=last):
            lab_col = PURPLE if (is_cur or (last and grow >= 1)) else GREY
            text(d, bx0 - 30, y + bar_h / 2, f"W{i + 1}", 800, 34, lab_col, anchor="rm")
            rrect(d, (bx0, y, bx1, y + bar_h), 12, fill=(44, 32, 44))
            full = bx0 + (bx1 - bx0) * grow
            run_end = bx0 + (bx1 - bx0) * share * grow
            rrect(d, (bx0, y, full, y + bar_h), 12, fill=WALK)
            rrect(d, (bx0, y, run_end, y + bar_h), 12, fill=ORANGE)
        st.layer(a, fn)

    # milestone caption
    if t >= ROW_START - 0.1:
        idx = max(k for k, (w, _) in enumerate(MILESTONES) if w <= current)
        w_from, cap = MILESTONES[idx]
        since = t - (ROW_START + w_from * ROW_STEP)
        p = enter(since, 0.0, 0.4)
        col = PURPLE if idx == len(MILESTONES) - 1 else WHITE
        st.layer(p, lambda d: text(d, SW / 2, 1100 + (1 - p) * 24, cap, 700, 50, col))
    rise_text(st, t, 2.0, SW / 2, 1190, "Based on the NHS Couch to 5K plan.", 500, 38, GREY)


def scene_5k(st, t):
    rise_text(st, t, 0.0, SW / 2, 430, "30 minutes.", 800, 150, WHITE)
    rise_text(st, t, 0.45, SW / 2, 610, "Non-stop.", 800, 116, PURPLE)
    prog = ease_in_out((t - 0.9) / 1.3)

    def bar(d):
        rrect(d, (90, 830, 990, 880), 16, fill=(44, 32, 44))
        rrect(d, (90, 830, 90 + 900 * prog, 880), 16, fill=ORANGE)
    st.layer(enter(t, 0.7), bar)
    rise_text(st, t, 1.6, SW / 2, 920, "From the couch to 30 minutes of running.", 500, 40, GREY)


def session_card(d, y, day, place, addr):
    rrect(d, (90, y, 990, y + 210), 28, fill=CARD, outline=(90, 54, 90), width=2)
    text(d, 140, y + 42, day, 800, 36, PURPLE, anchor="la")
    text(d, 140, y + 94, place, 800, 50, WHITE, anchor="la")
    text(d, 140, y + 158, addr, 500, 34, GREY, anchor="la")


def scene_sessions(st, t):
    rise_text(st, t, 0.0, SW / 2, 230, "Two group sessions", 800, 80, WHITE)
    rise_text(st, t, 0.1, SW / 2, 330, "a week", 800, 80, WHITE)
    for k, (y, day, place, addr) in enumerate([
        (480, "TUESDAY  7:00pm", "Aldi, Higher Lane", "Whitefield, M45 7EA"),
        (730, "THURSDAY  7:00pm", "Radcliffe Market", "Blackburn Street, M26 1PN"),
    ]):
        p = enter(t, 0.5 + k * 0.45, 0.6)
        st.layer(p, lambda d, y=y, day=day, place=place, addr=addr:
                 session_card(d, y + (1 - p) * 50, day, place, addr))
    rise_text(st, t, 1.6, SW / 2, 1000, "Plus one solo session a week", 700, 44, WHITE)
    rise_text(st, t, 1.7, SW / 2, 1060, "in your own time.", 500, 40, GREY)


def scene_graduate(st, t):
    rise_text(st, t, 0.0, SW / 2, 280, "Nobody gets", 800, 96, WHITE)
    rise_text(st, t, 0.1, SW / 2, 395, "left behind.", 800, 96, WHITE)
    rise_text(st, t, 0.5, SW / 2, 540, "You run with others on the same week.", 500, 40, GREY)
    p = enter(t, 1.2)
    st.layer(p, lambda d: rrect(d, (440, 660, 440 + 200 * p, 666), 3, fill=PURPLE))
    rise_text(st, t, 1.4, SW / 2, 730, "GRADUATION", 800, 40, PURPLE)
    rise_text(st, t, 1.6, SW / 2, 790, "Your first 5K:", 800, 76, WHITE)
    rise_text(st, t, 1.7, SW / 2, 885, "a group parkrun", 800, 76, WHITE)
    rise_text(st, t, 1.8, SW / 2, 980, "at Heaton Park", 800, 76, WHITE)
    rise_text(st, t, 2.3, SW / 2, 1100, "At your own pace, however long it takes.", 700, 38, PURPLE)
    rise_text(st, t, 2.5, SW / 2, 1160, "Then you join the main Thursday runs.", 500, 38, GREY)


def scene_end(st, t):
    p = enter(t, 0.0, 0.7)
    sc = 0.85 + 0.15 * p
    logo = LOGO_BIG if sc >= 0.999 else LOGO_BIG.resize(
        (s(200 * sc), s(200 * sc)), Image.LANCZOS)
    st.paste(logo, p, SW / 2 - 100 * sc, 150 + 100 * (1 - sc))
    rise_text(st, t, 0.2, SW / 2, 385, "Run Together Radcliffe", 700, 40, WHITE)
    rise_text(st, t, 0.35, SW / 2, 470, "Couch to 5K", 800, 120, PURPLE)
    rise_text(st, t, 0.6, SW / 2, 640, "Starts January 2027", 800, 64, WHITE)
    rise_text(st, t, 0.8, SW / 2, 740, "Free. No kit or experience needed.", 500, 40, GREY)
    pill = enter(t, 1.1, 0.6)
    pulse = 1 + 0.025 * math.sin(max(0, t - 1.7) * 4) if t > 1.7 else 1

    def cta(d):
        label = "radcliffe.run/c25k"
        w = (text_width(label, 800, 60) + 110) * pulse
        h = 120 * pulse
        cy = 900 + (1 - pill) * 40
        rrect(d, (SW / 2 - w / 2, cy - h / 2, SW / 2 + w / 2, cy + h / 2), h / 2,
              fill=PURPLE)
        text(d, SW / 2, cy, label, 800, 60, INK, anchor="mm")
    st.layer(pill, cta)
    rise_text(st, t, 1.5, SW / 2, 1010, "Sign up now", 700, 38, WHITE)


# (duration, fn, show_header, pace). pace > 1 stretches a scene's own timeline
# so each line lands after the previous one has had time to be read.
TIMELINE = [
    (5.0, scene_couch, True, 1.5),
    (7.0, scene_week1, True, 1.6),
    (12.5, scene_weeks, True, 1.0),
    (5.0, scene_5k, True, 1.4),
    (7.0, scene_sessions, True, 1.6),
    (7.5, scene_graduate, True, 1.7),
    (6.5, scene_end, False, 1.4),
]
SCENES = []  # (start, end, fn, show_header, pace)
_t = 0.0
for _dur, _fn, _hdr, _pace in TIMELINE:
    SCENES.append((_t, _t + _dur, _fn, _hdr, _pace))
    _t += _dur
DURATION = _t
FADE = 0.4


def render_stage(T):
    st = Stage()
    head_alpha = 0.0
    for (a, b, fn, hdr, pace) in SCENES:
        if a <= T < b or (b == DURATION and T >= b):
            local = (T - a) / pace
            out = clamp((b - T) / FADE) if b < DURATION else 1.0
            if out < 1.0:
                tmp = Stage()
                fn(tmp, local)
                st.paste(tmp.img, out, 0, 0)
            else:
                fn(st, local)
            head_alpha = (1.0 if hdr else 0.0)
            if hdr and b < DURATION and SCENES[[x[2] for x in SCENES].index(fn) + 1][3] is False:
                head_alpha = out
    head_alpha *= enter(T, 0.0, 0.6)
    header(st, head_alpha)
    return st.final()


# ---------- backgrounds ----------

def background(w, h):
    bg = Image.new("RGB", (w, h))
    px = []
    for y in range(h):
        f = y / (h - 1)
        px.append(tuple(int(BG_TOP[c] + (BG_BOT[c] - BG_TOP[c]) * f) for c in range(3)))
    grad = Image.new("RGB", (1, h))
    grad.putdata(px)
    bg = grad.resize((w, h))
    glow = Image.new("L", (w, h), 0)
    gd = ImageDraw.Draw(glow)
    r = int(w * 0.55)
    cx, cy = w // 2, int(h * 0.42)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=46)
    glow = glow.filter(ImageFilter.GaussianBlur(w * 0.18))
    tint = Image.new("RGB", (w, h), PURPLE)
    return Image.composite(tint, bg, glow).convert("RGBA")


FORMATS = {
    "4x5": (1080, 1350, 10),
    "9x16": (1080, 1920, 250),
}


def compose(stage, fmt, bg):
    w, h, off = FORMATS[fmt]
    frame = bg.copy()
    frame.alpha_composite(stage, (0, off))
    return frame.convert("RGB")


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    bgs = {k: background(w, h) for k, (w, h, _) in FORMATS.items()}

    if "--stills" in sys.argv:
        times = [float(x) for x in sys.argv[sys.argv.index("--stills") + 1].split(",")]
        for T in times:
            stage = render_stage(T)
            for k in FORMATS:
                compose(stage, k, bgs[k]).save(out / f"still_{k}_{T:05.2f}.png")
        return

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    procs = {}
    for k, (w, h, _) in FORMATS.items():
        procs[k] = subprocess.Popen(
            [ff, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
             "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
             "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
             "-profile:v", "high", "-movflags", "+faststart",
             str(out / f"rtr-c25k-{k}.mp4")],
            stdin=subprocess.PIPE)
    n = int(DURATION * FPS)
    for i in range(n):
        stage = render_stage(i / FPS)
        for k in FORMATS:
            procs[k].stdin.write(compose(stage, k, bgs[k]).tobytes())
        if i % 60 == 0:
            print(f"frame {i}/{n}", flush=True)
    for p in procs.values():
        p.stdin.close()
        p.wait()
    print("done")


if __name__ == "__main__":
    main()
