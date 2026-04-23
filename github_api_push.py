#!/usr/bin/env python3
"""
Push files to GitHub via the API — use instead of 'git push' from Cowork sessions
where FUSE mounts cause git lock file errors (Operation not permitted on HEAD.lock).

Usage (standalone):
    python3 github_api_push.py "commit message" file1.tsx [file2.tsx ...]
    (paths are relative to the radcliffe-run project folder)

Usage (as module):
    from github_api_push import push_files
    push_files("Fix admin nav", ["components/AdminShell.tsx", "app/admin/page.tsx"])

Why this exists:
    Git uses atomic rename() internally to create lock files (.git/HEAD.lock, .git/index.lock).
    macOS FUSE mounts (used by Cowork) do not support rename() across filesystem boundaries,
    so git always fails with "Operation not permitted". The GitHub Contents API is the
    correct workaround — it bypasses git entirely and pushes directly to the remote.
"""

import base64
import json
import os
import re
import sys
import urllib.request
import urllib.error

REPO     = "Runtogetherradcliffe/radcliffe-run"
BRANCH   = "main"
SITE_DIR = os.path.dirname(os.path.abspath(__file__))

# Token is stored in the RTR site repo's git config — read it from there
RTR_SITE_CONFIG = os.path.join(SITE_DIR, "..", "..", "RTR site", ".git", "config")


def _load_token() -> str:
    """Read the GitHub token from the RTR site's .git/config remote URL."""
    config_path = os.path.normpath(RTR_SITE_CONFIG)
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


def _get_sha(repo_path: str) -> "str | None":
    """Return the blob SHA of an existing file on GitHub, or None if it doesn't exist."""
    url = f"https://api.github.com/repos/{REPO}/contents/{repo_path}?ref={BRANCH}"
    req = urllib.request.Request(url, headers={"Authorization": f"token {TOKEN}"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)["sha"]
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def push_file(local_path: str, repo_path: str, message: str) -> str:
    """Upload a single file and return the resulting commit SHA."""
    with open(local_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()

    sha = _get_sha(repo_path)
    payload: dict = {"message": message, "content": content, "branch": BRANCH}
    if sha:
        payload["sha"] = sha  # required by GitHub API for updates (not creates)

    data = json.dumps(payload).encode()
    url  = f"https://api.github.com/repos/{REPO}/contents/{repo_path}"
    req  = urllib.request.Request(
        url, data=data,
        headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"},
        method="PUT",
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)["commit"]["sha"]


def push_files(message: str, relative_paths: list, verbose: bool = True) -> None:
    """
    Push one or more files to GitHub.

    Args:
        message:        Git commit message
        relative_paths: List of paths relative to the radcliffe-run project folder
        verbose:        Print progress to stdout (default True)
    """
    for rel in relative_paths:
        local = os.path.join(SITE_DIR, rel)
        if not os.path.exists(local):
            raise FileNotFoundError(f"File not found: {local}")
        if verbose:
            print(f"  Pushing {rel} ...", end=" ", flush=True)
        sha = push_file(local, rel, message)
        if verbose:
            print(f"ok ({sha[:7]})")
    if verbose:
        print(f"\nPublished to https://github.com/Runtogetherradcliffe/radcliffe-run")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        print("Usage: python3 github_api_push.py 'commit message' file1 [file2 ...]")
        sys.exit(1)
    push_files(sys.argv[1], sys.argv[2:])
