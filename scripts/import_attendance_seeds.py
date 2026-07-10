#!/usr/bin/env python3
"""Attendance recognition backfill importer (eras 1 + 2). Idempotent, dry-run
by default. Decision record: docs/ATTENDANCE_RECOGNITION_BRIEF.md.

Era 1 (seeds - per-member offsets, no dates):
  --csv FILE      old-site runner export ("First Name,Last Name,Email Address,
                  Sessions Checked In") -> attendance_seeds kind='run',
                  source='oldsite_csv', as_of 2026-04-30.
  --polls FILE    resolved WhatsApp leader polls JSON -> attendance_seeds,
                  source='leader_polls', as_of 2026-07-09. Each leader-night
                  seeds BOTH kind='volunteer' AND kind='run' (leading implies
                  attending - revised model, 10 Jul 2026). Tally logic is
                  reused from data/leader-polls/tally_attendance.py (an
                  available vote = a leader-night; distinct dates).
  --precounts DIR dated full exports (outset -> end date, named
                  ...-to-YYYY-MM-DD.csv) that deduplicate a leader's run
                  credit: check-ins DURING their poll era are assumed to be
                  led nights, so their oldsite_csv run seed becomes the
                  export count just before their FIRST poll answer, and the
                  poll nights supply the rest. Leaders without a suitable
                  export fall back to full CSV + polls with a loud warning.
  --poll-exclude  JSON list of poll names given NO volunteer credit
                  (Paul's call): they count as ordinary runners (full CSV).

Era 2 (real attendance rows, from Paul's photo reconstruction):
  --checkins FILE CSV with header: date,email_or_name,group_key
                  (group_key optional: 8k|5k|jeff). Rows become `attendance`
                  rows with source='photo', anchored to that date's
                  shortest-distance run row - the SAME anchor convention as the
                  live check-in, so one member never gets two rows for one
                  night. Dates must fall inside 2026-05-04..2026-07-09 (before
                  that is the CSV seed's era; after it is live check-in).
                  Photo rows must NOT be created in run_leadership: leader
                  history through 9 Jul is already covered by the polls seed.

GDPR: people in the source files who do not match a registered member are
REPORTED but never written to the database. Re-run the importer after someone
registers and their history attaches then.

Matching (report shows the classification of every person):
  alias        - explicit entry in the aliases JSON (--aliases, gitignored,
                 because it contains emails; see data/attendance-backfill/)
  email+name   - email and normalised name both match a member
  email        - email matches exactly one member (e.g. name changed)
  name         - normalised name matches exactly one member (email differs
                 or blank) - eyeball these in the dry run
CSV rows with the same normalised name are summed as one person (the old site
accumulated duplicate profiles); the report lists every merge.

Credentials: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment,
falling back to .env.local (the DEV project). Point the env vars at
production only when the dry run has been approved.

Usage:
  python3 scripts/import_attendance_seeds.py --csv FILE --polls FILE [--aliases FILE]
  python3 scripts/import_attendance_seeds.py --checkins FILE
  ... --apply         actually write (default is dry run)
"""
import argparse
import csv
import json
import os
import re
import ssl
import sys
import unicodedata
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

try:  # python.org macOS builds ship no CA bundle; certifi fills the gap
    import certifi
    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CTX = ssl.create_default_context()

REPO = Path(__file__).resolve().parent.parent
RUN_SEED_AS_OF = "2026-04-30"   # last old-site Thursday before the new site
VOL_SEED_AS_OF = "2026-07-09"   # polls cover through the first live check-in
ERA2_START, ERA2_END = "2026-05-04", "2026-07-09"
GROUPS = {"8k", "5k", "jeff"}


def norm_name(first, last=""):
    s = unicodedata.normalize("NFKD", f"{first} {last}")
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def load_env_local():
    env = {}
    p = REPO / ".env.local"
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def supabase_creds():
    env = load_env_local()
    url = os.environ.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (env or .env.local)")
    return url.rstrip("/"), key


def rest(url, key, method, path, body=None, prefer=None):
    req = urllib.request.Request(f"{url}/rest/v1/{path}", method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, data=data, context=SSL_CTX) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def fetch_members(url, key, members_json=None):
    if members_json:  # offline dry-run against a dumped members list
        members = json.loads(Path(members_json).read_text())
    else:
        members = rest(url, key, "GET",
                       "members?select=id,email,first_name,last_name,status&limit=2000")
    members = [m for m in members if m.get("status", "active") == "active"]
    by_email, by_name = defaultdict(list), defaultdict(list)
    for m in members:
        m["norm_name"] = norm_name(m["first_name"] or "", m["last_name"] or "")
        if m.get("email"):
            by_email[m["email"].strip().lower()].append(m)
        by_name[m["norm_name"]].append(m)
    return members, by_email, by_name


# ── era 1: runner CSV ────────────────────────────────────────────────────────

def load_runner_csv(path):
    """Group rows by normalised name, summing counts (old-site dup profiles)."""
    groups = defaultdict(lambda: {"rows": [], "total": 0})
    with open(path, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            n = int(r["Sessions Checked In"])
            key = norm_name(r["First Name"], r["Last Name"])
            g = groups[key]
            g["rows"].append({
                "name": f"{r['First Name'].strip()} {r['Last Name'].strip()}",
                "email": r["Email Address"].strip().lower(),
                "n": n,
            })
            g["total"] += n
    return {k: g for k, g in groups.items() if g["total"] > 0}


def match_group(key, g, by_email, by_name, aliases):
    """Return (member, how) or (None, None). See module docstring."""
    emails = [r["email"] for r in g["rows"] if r["email"]]
    for e in emails:
        if e in aliases:
            target = by_email.get(aliases[e].lower(), [])
            if len(target) == 1:
                return target[0], "alias"
    for e in emails:  # email + name
        for m in by_email.get(e, []):
            if m["norm_name"] == key:
                return m, "email+name"
    for e in emails:  # email only, unambiguous (e.g. surname changed)
        ms = by_email.get(e, [])
        if len(ms) == 1:
            return ms[0], "email"
    ms = by_name.get(key, [])  # name only, unambiguous
    if len(ms) == 1:
        return ms[0], "name"
    return None, None


# ── era 1: leader polls ──────────────────────────────────────────────────────

def load_poll_tally(polls_path):
    """Per leader: poll led-night count AND first poll answer date.

    The first answer (any vote, run polls only) marks when their availability
    started being tracked - old-site check-ins from then on are assumed to be
    nights they led (the double-count window)."""
    sys.path.insert(0, str(REPO / "data" / "leader-polls"))
    import tally_attendance  # noqa: E402
    attend, names, _skipped = tally_attendance.main(polls_path)
    first_answer = {}
    for p in json.loads(Path(polls_path).read_text()):
        q = " ".join((p["question"] or "").split())
        if any(p["posted"][:10] == d and q.startswith(pre)
               for d, pre in tally_attendance.EXCLUDE) \
           or any(k in q.lower() for k in tally_attendance.EXCLUDE_Q):
            continue
        for v in p["votes"]:
            d = date.fromisoformat(v["voted_at"][:10])
            if v["person"] not in first_answer or d < first_answer[v["person"]]:
                first_answer[v["person"]] = d
    return (
        {names[person]: len(dates) for person, dates in attend.items()},
        {names[person]: first_answer.get(person) for person in attend},
    )


def load_precounts(dirpath):
    """Dated old-site exports (outset -> end date), named ...-to-YYYY-MM-DD.csv."""
    out = {}
    for p in sorted(Path(dirpath).glob("*.csv")):
        m = re.search(r"(\d{4}-\d{2}-\d{2})", p.name)
        if not m:
            print(f"  WARNING: precount file without a date in its name, skipped: {p.name}")
            continue
        out[date.fromisoformat(m[1])] = load_runner_csv(p)
    return out


def precount_for(member, groups, aliases):
    """The member's check-in count inside one dated export (0 if absent)."""
    email = (member.get("email") or "").strip().lower()
    for key, g in groups.items():
        emails = {r["email"] for r in g["rows"] if r["email"]}
        if email and (email in emails or any(aliases.get(e) == email for e in emails)):
            return g["total"]
        if key == member["norm_name"]:
            return g["total"]
    return 0


# ── era 2: photo check-ins ───────────────────────────────────────────────────

def fetch_anchor_runs(url, key):
    """date -> anchor run id: shortest-distance non-cancelled regular run."""
    runs = rest(url, key, "GET",
                "runs?select=id,date,distance_km,run_type,cancelled"
                f"&date=gte.{ERA2_START}&date=lte.{ERA2_END}&order=date")
    anchors = {}
    for r in runs:
        if r["cancelled"] or r["run_type"] != "regular":
            continue
        d = r["date"]
        if d not in anchors or float(r["distance_km"] or 999) < anchors[d][1]:
            anchors[d] = (r["id"], float(r["distance_km"] or 999))
    return {d: rid for d, (rid, _) in anchors.items()}


def render_html(rpt):
    """Self-contained review page: leaders' workings, combined totals,
    runner seeds, and the not-imported list. Local file only - it contains
    personal data, so it lives in the gitignored backfill dir."""
    import html as h
    e = h.escape

    STATUS = {
        "ok":       ("deduped", "#2e7d2e", "#edf7ed"),
        "missing":  ("MISSING export - over-counts", "#b3261e", "#fdecea"),
        "excluded": ("excluded - ordinary runner", "#666", "#eee"),
        "no_match": ("not a member - not imported", "#666", "#eee"),
    }

    def badge(text, fg, bg):
        return (f'<span style="background:{bg};color:{fg};border-radius:9px;'
                f'padding:1px 9px;font-size:12px;white-space:nowrap">{text}</span>')

    vol_rows = []
    for v in rpt["volunteers"]:
        label, fg, bg = STATUS[v["status"]]
        if v["status"] == "ok":
            workings = (f'{v["precount"]} pre-poll <span style="color:#888">[to {v["cutoff"]}]</span>'
                        f' + {v["count"]} led = <b>{v["precount"] + v["count"]}</b>')
        elif v["status"] == "missing":
            workings = f'full CSV + {v["count"]} (needs export before {e(v["first"])})'
        else:
            workings = ""
        member = e(v.get("member") or "")
        vol_rows.append(f'<tr><td class="n">{v["count"]}</td><td>{e(v["poll"])}</td>'
                        f'<td>{member}</td><td>{workings}</td><td>{badge(label, fg, bg)}</td></tr>')

    leaders = {t["member"] for t in rpt["totals"] if t["volunteer"] > 0}
    tot_rows = []
    for i, t in enumerate(rpt["totals"], 1):
        star = badge("leader", "#7a4a00", "#fdf3e0") if t["member"] in leaders else ""
        tot_rows.append(f'<tr><td class="n">{i}</td><td>{e(t["member"])} {star}</td>'
                        f'<td class="n"><b>{t["run"]}</b></td><td class="n">{t["volunteer"] or ""}</td></tr>')

    run_rows = []
    for r in sorted(rpt["runners"], key=lambda x: -x["count"]):
        flags = []
        if r["precount_file"]:
            flags.append(badge(f'precount to {r["precount_file"]}; full CSV {r["full"]}', "#2e7d2e", "#edf7ed"))
        if r["how"] != "email+name":
            flags.append(badge(f'matched by {r["how"]} - check', "#7a4a00", "#fdf3e0"))
        if r["merged"]:
            flags.append(badge("duplicate rows summed", "#1a4a7a", "#e8f0f8"))
        run_rows.append(f'<tr><td class="n">{r["count"]}</td><td>{e(r["member"])}</td>'
                        f'<td>{" ".join(flags)}</td></tr>')

    un_rows = [f'<tr><td class="n">{u["count"]}</td><td>{e(u["detail"])}</td></tr>'
               for u in rpt["unmatched"]]
    un_total = sum(u["count"] for u in rpt["unmatched"])
    imported = sum(t["run"] for t in rpt["totals"])

    return f"""<meta charset="utf-8">
<title>Attendance seed review - {rpt["mode"]}</title>
<style>
  body {{ font: 15px/1.5 -apple-system, system-ui, sans-serif; color: #1a1a1a;
         max-width: 860px; margin: 40px auto; padding: 0 20px; }}
  h1 {{ font-size: 22px; }} h2 {{ font-size: 17px; margin-top: 36px; }}
  table {{ border-collapse: collapse; width: 100%; margin-top: 10px; }}
  th {{ text-align: left; font-size: 12px; text-transform: uppercase; color: #888;
       border-bottom: 2px solid #ddd; padding: 6px 10px; }}
  td {{ padding: 5px 10px; border-bottom: 1px solid #eee; }}
  td.n {{ text-align: right; font-variant-numeric: tabular-nums; width: 1%; }}
  tr:hover {{ background: #fafafa; }}
  .cards {{ display: flex; gap: 14px; flex-wrap: wrap; margin-top: 18px; }}
  .card {{ background: #f6f6f6; border-radius: 10px; padding: 12px 18px; }}
  .card b {{ font-size: 22px; display: block; }}
  .muted {{ color: #888; font-size: 13px; }}
  summary {{ cursor: pointer; font-weight: 600; margin-top: 36px; }}
  input {{ font: inherit; padding: 6px 10px; border: 1px solid #ccc;
          border-radius: 8px; width: 240px; margin-top: 10px; }}
</style>
<h1>Attendance seed review <span class="muted">({rpt["mode"].lower()})</span></h1>
<div class="cards">
  <div class="card"><b>{len(rpt["totals"])}</b>members get history</div>
  <div class="card"><b>{imported:,}</b>run credits</div>
  <div class="card"><b>{len([v for v in rpt["volunteers"] if v["status"] in ("ok", "missing")])}</b>leaders credited</div>
  <div class="card"><b>{len(rpt["unmatched"])}</b>people not imported <span class="muted">({un_total:,} sessions)</span></div>
</div>

<h2>Leaders - volunteer credit and run workings</h2>
<p class="muted">Run credit = check-ins before their first poll + led nights (no night counted twice).</p>
<table><tr><th>Led</th><th>Poll name</th><th>Member</th><th>Run workings</th><th></th></tr>{"".join(vol_rows)}</table>

<h2>Combined totals - what each member's ladder will show</h2>
<input placeholder="Filter by name..." oninput="f(this, 'tot')">
<table id="tot"><tr><th>#</th><th>Member</th><th>Runs</th><th>Volunteer</th></tr>{"".join(tot_rows)}</table>

<h2>Run seeds from the old-site export</h2>
<p class="muted">Amber rows matched by something weaker than email+name - worth an eyeball.</p>
<input placeholder="Filter by name..." oninput="f(this, 'run')">
<table id="run"><tr><th>Runs</th><th>Member</th><th>Notes</th></tr>{"".join(run_rows)}</table>

<details><summary>Not imported - never registered on the new site ({len(rpt["unmatched"])} people, {un_total:,} sessions)</summary>
<p class="muted">Kept only in the source files. Re-run the import after someone registers and their history attaches.</p>
<table><tr><th>Runs</th><th>Name(s) in the old-site export</th></tr>{"".join(un_rows)}</table></details>

<script>
function f(inp, id) {{
  const q = inp.value.toLowerCase();
  for (const tr of document.getElementById(id).rows)
    if (tr.rowIndex) tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
}}
</script>
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", help="old-site runner export CSV (era 1, run seeds)")
    ap.add_argument("--polls", help="leaders_polls_resolved.json (era 1, volunteer seeds)")
    ap.add_argument("--checkins", help="photo reconstruction CSV (era 2, attendance rows)")
    ap.add_argument("--aliases", default=str(REPO / "data" / "attendance-backfill" / "aliases.json"),
                    help="JSON: {source_email_or_name: member_email} (gitignored)")
    ap.add_argument("--precounts", default=str(REPO / "data" / "attendance-backfill" / "precounts"),
                    help="dir of dated exports (outset -> end date) used to deduplicate "
                         "leaders' run credit against their poll era")
    ap.add_argument("--poll-exclude", default=str(REPO / "data" / "attendance-backfill" / "poll-exclude.json"),
                    help="JSON list of poll names to exclude from volunteer credit "
                         "(counted as ordinary runners)")
    ap.add_argument("--members-json", help="offline members dump for a credential-free dry run")
    ap.add_argument("--html", help="also write a readable HTML review page to this path")
    ap.add_argument("--emit-sql", help="write the seed upsert as SQL to this path instead of "
                                       "applying over REST (for applying via the Supabase MCP "
                                       "when the target's service key is not on this machine)")
    ap.add_argument("--apply", action="store_true", help="write to the database (default: dry run)")
    args = ap.parse_args()
    if args.apply and args.members_json:
        ap.error("--apply must read members live, not from --members-json")
    if not (args.csv or args.polls or args.checkins):
        ap.error("nothing to do: pass --csv, --polls and/or --checkins")

    url, key = supabase_creds()
    mode = "APPLY" if args.apply else "DRY RUN"
    print(f"{mode} against {url}\n")

    aliases = {}
    if Path(args.aliases).exists():
        aliases = {k.strip().lower(): v for k, v in json.loads(Path(args.aliases).read_text()).items()}

    members, by_email, by_name = fetch_members(url, key, args.members_json)
    print(f"{len(members)} active members loaded"
          + (f" from {args.members_json}" if args.members_json else ""))

    seed_rows = []
    run_override = {}  # member_id -> precount replacing their full-CSV run count
    rpt = {"mode": mode, "volunteers": [], "runners": [], "unmatched": [], "totals": []}

    exclude = set()
    if Path(args.poll_exclude).exists():
        exclude = {n.strip().lower() for n in json.loads(Path(args.poll_exclude).read_text())}

    # Polls first: they decide which members get precount-overridden CSV counts.
    if args.polls:
        tally, first_answer = load_poll_tally(args.polls)
        precounts = load_precounts(args.precounts) if Path(args.precounts).is_dir() else {}
        print(f"\n── VOLUNTEER SEEDS (leader_polls, as of {VOL_SEED_AS_OF}) ──")
        if precounts:
            print("  precount exports: " + ", ".join(d.isoformat() for d in sorted(precounts)))
        for name, count in sorted(tally.items(), key=lambda kv: -kv[1]):
            if name.strip().lower() in exclude:
                print(f"  {count:>4}  {name} -> EXCLUDED from volunteer credit (Paul's call, "
                      f"10 Jul 2026) - counted as an ordinary runner")
                rpt["volunteers"].append({"poll": name, "count": count, "status": "excluded"})
                continue
            target = aliases.get(name.strip().lower())
            ms = by_email.get(target.lower(), []) if target else by_name.get(norm_name(name), [])
            if len(ms) != 1:
                print(f"  {count:>4}  {name} -> NO MEMBER MATCH (not imported)")
                rpt["volunteers"].append({"poll": name, "count": count, "status": "no_match"})
                continue
            m = ms[0]
            first = first_answer.get(name)
            # The export must end JUST before their first poll (<=21 days) -
            # an older export would miss their pre-poll runner history.
            cutoffs = [d for d in precounts
                       if first and d < first and (first - d).days <= 21]
            if cutoffs:
                cutoff = max(cutoffs)
                pre = precount_for(m, precounts[cutoff], aliases)
                run_override[m["id"]] = {"precount": pre, "file": cutoff.isoformat(), "poll": name}
                note = f"run = {pre} pre-poll check-ins [to {cutoff}] + {count} led nights"
                rpt["volunteers"].append({"poll": name, "count": count, "status": "ok",
                                          "member": f"{m['first_name'].strip()} {m['last_name'].strip()}",
                                          "precount": pre, "cutoff": cutoff.isoformat()})
            else:
                note = (f"MISSING precount export before first poll {first} - "
                        f"run keeps FULL CSV + {count} (over-counts, add the export)")
                rpt["volunteers"].append({"poll": name, "count": count, "status": "missing",
                                          "member": f"{m['first_name'].strip()} {m['last_name'].strip()}",
                                          "first": str(first)})
            print(f"  {count:>4}  {name} -> {m['first_name'].strip()} {m['last_name'].strip()}  ({note})")
            seed_rows.append({
                "member_id": m["id"], "kind": "volunteer", "count": count,
                "as_of": VOL_SEED_AS_OF, "source": "leader_polls",
                "source_detail": f"poll name: {name}",
            })
            # leading implies attending: the same nights seed the run ladder
            seed_rows.append({
                "member_id": m["id"], "kind": "run", "count": count,
                "as_of": VOL_SEED_AS_OF, "source": "leader_polls",
                "source_detail": f"poll name: {name} (leader-nights count as runs)",
            })

    if args.csv:
        groups = load_runner_csv(args.csv)
        matched, unmatched = [], []
        for key_, g in sorted(groups.items(), key=lambda kv: -kv[1]["total"]):
            m, how = match_group(key_, g, by_email, by_name, aliases)
            detail = " + ".join(f"{r['name']} ({r['n']})" for r in g["rows"])
            if m:
                matched.append((m, g["total"], how, detail))
            else:
                unmatched.append((g["total"], detail))
        print(f"\n── RUN SEEDS (oldsite_csv, as of {RUN_SEED_AS_OF}) "
              f"── {len(matched)} matched, {len(unmatched)} unmatched (not imported)")
        for m, total, how, detail in matched:
            flag = "" if how == "email+name" else f"  [{how}]"
            merge = "  MERGED: " + detail if "+" in detail else ""
            ov = run_override.get(m["id"])
            use = total
            if ov is not None:
                use = ov["precount"]
                detail = (f"pre-poll check-ins to {ov['file']} "
                          f"(full CSV {total} overlaps the poll era)")
                flag = f"  [precount; full CSV {total}]"
            print(f"  {use:>4}  {m['first_name'].strip()} {m['last_name'].strip()}{flag}{merge}")
            rpt["runners"].append({"member": f"{m['first_name'].strip()} {m['last_name'].strip()}",
                                   "count": use, "full": total, "how": how,
                                   "merged": "+" in detail and ov is None,
                                   "precount_file": ov["file"] if ov else None})
            seed_rows.append({
                "member_id": m["id"], "kind": "run", "count": use,
                "as_of": RUN_SEED_AS_OF, "source": "oldsite_csv",
                "source_detail": f"{detail} [{how}]",
            })
        # Poll leaders absent from the full CSV (e.g. never checked in) still
        # get an explicit row so a re-run overwrites any stale earlier value.
        seen = {m["id"] for m, _, _, _ in matched}
        for mid, ov in run_override.items():
            if mid not in seen:
                seed_rows.append({
                    "member_id": mid, "kind": "run", "count": ov["precount"],
                    "as_of": RUN_SEED_AS_OF, "source": "oldsite_csv",
                    "source_detail": f"pre-poll check-ins to {ov['file']} (no row in full CSV)",
                })
        print(f"  unmatched (kept only in the source file): "
              f"{sum(t for t, _ in unmatched)} sessions across {len(unmatched)} people")
        rpt["unmatched"] = [{"count": t, "detail": d} for t, d in unmatched]
        for total, detail in unmatched[:200]:
            print(f"    - {total:>4}  {detail}")

    # Aggregate per (member, kind, source): if two source groups map to the
    # same member (e.g. rows under a maiden AND married name), their counts
    # must SUM - the upsert alone would let the last row win.
    if seed_rows:
        merged = {}
        for row in seed_rows:
            k = (row["member_id"], row["kind"], row["source"])
            if k in merged:
                print(f"  NOTE cross-group merge for one member ({row['kind']}/{row['source']}): "
                      f"{merged[k]['source_detail']}  +  {row['source_detail']}")
                merged[k]["count"] += row["count"]
                merged[k]["source_detail"] += " + " + row["source_detail"]
            else:
                merged[k] = dict(row)
        seed_rows = list(merged.values())

    if seed_rows:
        # Combined per-member totals - what the ladder will actually show
        # (a leader's run total = CSV check-ins + poll leader-nights).
        name_of = {m["id"]: f"{m['first_name'].strip()} {m['last_name'].strip()}" for m in members}
        totals = {}
        for row in seed_rows:
            t = totals.setdefault(row["member_id"], {"run": 0, "volunteer": 0})
            t[row["kind"]] += row["count"]
        print(f"\n── COMBINED SEED TOTALS (run / volunteer, as the API will report them) ──")
        for mid, t in sorted(totals.items(), key=lambda kv: -(kv[1]["run"] + kv[1]["volunteer"])):
            print(f"  {t['run']:>4} / {t['volunteer']:<4}  {name_of[mid]}")
            rpt["totals"].append({"member": name_of[mid], "run": t["run"], "volunteer": t["volunteer"]})

    if args.html:
        Path(args.html).write_text(render_html(rpt), encoding="utf-8")
        print(f"\nHTML review page written to {args.html}")

    if args.emit_sql and seed_rows:
        def tup(r):
            detail = (r.get("source_detail") or "").replace("'", "''")
            return (f"('{r['member_id']}','{r['kind']}',{r['count']},"
                    f"'{r['as_of']}','{r['source']}','{detail}')")
        sql = ("-- attendance_seeds upsert, generated by import_attendance_seeds.py\n"
               "-- idempotent: re-running updates counts in place\n"
               "INSERT INTO attendance_seeds (member_id, kind, count, as_of, source, source_detail)\nVALUES\n"
               + ",\n".join(tup(r) for r in seed_rows)
               + "\nON CONFLICT (member_id, kind, source) DO UPDATE SET count = EXCLUDED.count,\n"
                 "  as_of = EXCLUDED.as_of, source_detail = EXCLUDED.source_detail, updated_at = now();\n")
        Path(args.emit_sql).write_text(sql, encoding="utf-8")
        print(f"\nSQL for {len(seed_rows)} seed rows written to {args.emit_sql}")

    if seed_rows and args.apply:
        rest(url, key, "POST", "attendance_seeds?on_conflict=member_id,kind,source",
             body=seed_rows, prefer="resolution=merge-duplicates")
        print(f"\nUpserted {len(seed_rows)} seed rows")

    if args.checkins:
        anchors = fetch_anchor_runs(url, key)
        rows, problems = [], []
        with open(args.checkins, newline="", encoding="utf-8-sig") as f:
            for i, r in enumerate(csv.DictReader(f), start=2):
                d = r["date"].strip()
                who = r["email_or_name"].strip().lower()
                grp = (r.get("group_key") or "").strip().lower() or None
                if grp and grp not in GROUPS:
                    problems.append(f"line {i}: bad group_key {grp!r}")
                    continue
                if d not in anchors:
                    problems.append(f"line {i}: no anchor run for {d} "
                                    f"(era 2 is {ERA2_START}..{ERA2_END}, regular runs only)")
                    continue
                target = aliases.get(who, who)
                ms = by_email.get(target, []) or by_name.get(re.sub(r"[^a-z]", "", target), [])
                if len(ms) != 1:
                    problems.append(f"line {i}: {r['email_or_name']!r} matched {len(ms)} members")
                    continue
                rows.append({"run_id": anchors[d], "member_id": ms[0]["id"],
                             "source": "photo", "group_key": grp,
                             "recorded_at": f"{d}T19:00:00Z"})
        print(f"\n── ERA-2 CHECK-INS (photo) ── {len(rows)} rows, {len(problems)} problems")
        for p in problems:
            print(f"    ! {p}")
        if rows and args.apply:
            # ignore-duplicates: an existing row (live check-in) always wins
            # over a photo reconstruction of the same (run, member)
            rest(url, key, "POST", "attendance?on_conflict=run_id,member_id",
                 body=rows, prefer="resolution=ignore-duplicates")
            print(f"Inserted {len(rows)} attendance rows (existing rows untouched)")

    if not args.apply:
        print("\nDry run only - nothing written. Re-run with --apply to write.")


if __name__ == "__main__":
    main()
