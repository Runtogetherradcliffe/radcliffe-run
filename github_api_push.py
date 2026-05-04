#!/usr/bin/env python3
"""
Push files to GitHub via the API — use instead of 'git push' from Cowork sessions
where FUSE mounts cause git lock file errors (Operation not permitted on HEAD.lock).

Creates a SINGLE commit for all files (one Vercel build, not one per file).

Usage (standalone):
    python3 github_api_push.py "commit message" file1.tsx [file2.tsx ...]
    (paths are relative to the radcliffe-run project folder)

Usage (as module):
    from github_api_push import push_files
    push_files("Fix admin nav", ["components/AdminShell.tsx", "app/admin/page.tsx"])

Why this exists:
    Git uses atomic rename() internally to create lock files (.git/HEAD.lock, .git/index.lock).
    macOS FUSE mounts (used by Cowork) do not support rename() across filesystem boundaries,
    so git always fails with "Operation not permitted". The GitHub Git Trees API is the
    correct workaround — it bypasses git entirely and creates one commit for all files.
"""

import base64
import json
import os
import re
import ssl
import sys
import urllib.request
import urllib.error

try:
    import certifi
    _SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CONTEXT = None

REPO     = "Runtogetherradcliffe/radcliffe-run"
BRANCH   = "main"
SITE_DIR = os.path.dirname(os.path.abspath(__file__))

# Token is stored in the RTR site repo's git config — check both Cowork mount path
# and the local Mac path (Downloads/code for claude/RTR site)
_CONFIG_CANDIDATES = [
    os.path.join(SITE_DIR, "..", "..", "RTR site", ".git", "config"),
    os.path.expanduser("~/Downloads/code for claude/RTR site/.git/config"),
]


def _load_token() -> str:
    """Read the GitHub token from the RTR site's .git/config remote URL."""
    for candidate in _CONFIG_CANDIDATES:
        config_path = os.path.normpath(candidate)
        if os.path.exists(config_path):
            with open(config_path) as f:
                text = f.read()
            m = re.search(r"https://([^@]+)@github\.com", text)
            if m:
                return m.group(1)
    raise RuntimeError(
        "Could not find GitHub token. "
        "Check the RTR site .git/config has a token in the remote origin URL."
    )


TOKEN = _load_token()


def _api(method: str, path: str, body: dict = None) -> dict:
    """Make a GitHub API call and return the parsed JSON response."""
    url = f"https://api.github.com/repos/{REPO}/{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "Authorization": f"token {TOKEN}",
            "Content-Type": "application/json",
            "Accept": "application/vnd.github+json",
        },
    )
    with urllib.request.urlopen(req, context=_SSL_CONTEXT) as r:
        return json.load(r)


def push_files(message: str, relative_paths: list, verbose: bool = True) -> None:
    """
    Push one or more files to GitHub in a single commit (one Vercel build).

    Args:
        message:        Git commit message
        relative_paths: List of paths relative to the radcliffe-run project folder
        verbose:        Print progress to stdout (default True)
    """
    # Validate all files exist before touching the API
    for rel in relative_paths:
        local = os.path.join(SITE_DIR, rel)
        if not os.path.exists(local):
            raise FileNotFoundError(f"File not found: {local}")

    # 1. Get the current HEAD commit and its tree SHA
    ref_data    = _api("GET", f"git/refs/heads/{BRANCH}")
    head_sha    = ref_data["object"]["sha"]
    commit_data = _api("GET", f"git/commits/{head_sha}")
    base_tree   = commit_data["tree"]["sha"]

    # 2. Create a blob for each file
    tree_items = []
    for rel in relative_paths:
        local = os.path.join(SITE_DIR, rel)
        if verbose:
            print(f"  Uploading {rel} ...", end=" ", flush=True)
        with open(local, "rb") as f:
            content = base64.b64encode(f.read()).decode()
        blob = _api("POST", "git/blobs", {"content": content, "encoding": "base64"})
        tree_items.append({
            "path": rel,
            "mode": "100644",
            "type": "blob",
            "sha": blob["sha"],
        })
        if verbose:
            print("ok")

    # 3. Create a new tree from all blobs
    if verbose:
        print(f"  Creating tree ...", end=" ", flush=True)
    new_tree = _api("POST", "git/trees", {"base_tree": base_tree, "tree": tree_items})
    if verbose:
        print(f"ok ({new_tree['sha'][:7]})")

    # 4. Create a single commit
    if verbose:
        print(f"  Creating commit ...", end=" ", flush=True)
    new_commit = _api("POST", "git/commits", {
        "message": message,
        "tree": new_tree["sha"],
        "parents": [head_sha],
    })
    if verbose:
        print(f"ok ({new_commit['sha'][:7]})")

    # 5. Advance the branch ref
    _api("PATCH", f"git/refs/heads/{BRANCH}", {"sha": new_commit["sha"]})

    if verbose:
        print(f"\nPublished to https://github.com/Runtogetherradcliffe/radcliffe-run")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        print("Usage: python3 github_api_push.py 'commit message' file1 [file2 ...]")
        sys.exit(1)
    push_files(sys.argv[1], sys.argv[2:])
