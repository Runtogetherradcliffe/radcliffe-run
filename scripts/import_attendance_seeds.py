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
                  attending - revised model, 10 Jul 2026), so a leader's run
                  total = old-site CSV + poll nights. Tally logic is reused
                  from data/leader-polls/tally_attendance.py (an available
                  vote = a leader-night; distinct dates).

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
    sys.path.insert(0, str(REPO / "data" / "leader-polls"))
    import tally_attendance  # noqa: E402
    attend, names, _skipped = tally_attendance.main(polls_path)
    return {names[person]: len(dates) for person, dates in attend.items()}


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


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", help="old-site runner export CSV (era 1, run seeds)")
    ap.add_argument("--polls", help="leaders_polls_resolved.json (era 1, volunteer seeds)")
    ap.add_argument("--checkins", help="photo reconstruction CSV (era 2, attendance rows)")
    ap.add_argument("--aliases", default=str(REPO / "data" / "attendance-backfill" / "aliases.json"),
                    help="JSON: {source_email_or_name: member_email} (gitignored)")
    ap.add_argument("--members-json", help="offline members dump for a credential-free dry run")
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
            print(f"  {total:>4}  {m['first_name'].strip()} {m['last_name'].strip()}{flag}{merge}")
            seed_rows.append({
                "member_id": m["id"], "kind": "run", "count": total,
                "as_of": RUN_SEED_AS_OF, "source": "oldsite_csv",
                "source_detail": f"{detail} [{how}]",
            })
        print(f"  unmatched (kept only in the source file): "
              f"{sum(t for t, _ in unmatched)} sessions across {len(unmatched)} people")
        for total, detail in unmatched[:200]:
            print(f"    - {total:>4}  {detail}")

    if args.polls:
        tally = load_poll_tally(args.polls)
        print(f"\n── VOLUNTEER SEEDS (leader_polls, as of {VOL_SEED_AS_OF}) ──")
        for name, count in sorted(tally.items(), key=lambda kv: -kv[1]):
            target = aliases.get(name.strip().lower())
            ms = by_email.get(target.lower(), []) if target else by_name.get(norm_name(name), [])
            if len(ms) == 1:
                m = ms[0]
                print(f"  {count:>4}  {name} -> {m['first_name'].strip()} {m['last_name'].strip()}"
                      f"  (+{count} run credit)")
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
            else:
                print(f"  {count:>4}  {name} -> NO MEMBER MATCH (not imported)")

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
