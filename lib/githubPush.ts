// Pushes a single file to GitHub via the Contents API.
// Requires GITHUB_TOKEN env var (Personal Access Token with repo write scope).
// Used by admin API routes to update GPX and map image files.

const REPO = 'Runtogetherradcliffe/radcliffe-run'
const API_BASE = `https://api.github.com/repos/${REPO}/contents`

export async function pushFileToGitHub(
  repoPath: string,   // e.g. 'public/gpx/my-route.gpx'
  content: Buffer,
  commitMessage: string,
  branch = 'staging'
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { ok: false, error: 'GITHUB_TOKEN not configured' }

  const url = `${API_BASE}/${repoPath}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // Get current file SHA (needed to update an existing file)
  let sha: string | undefined
  try {
    const getRes = await fetch(`${url}?ref=${branch}`, { headers })
    if (getRes.ok) {
      const data = await getRes.json() as { sha: string }
      sha = data.sha
    }
  } catch {
    // File doesn't exist yet - that's fine
  }

  const body: Record<string, string> = {
    message: commitMessage,
    content: content.toString('base64'),
    branch,
  }
  if (sha) body.sha = sha

  const putRes = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({})) as { message?: string }
    return { ok: false, error: err.message ?? `GitHub API error ${putRes.status}` }
  }

  return { ok: true }
}
