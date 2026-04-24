/**
 * Builds the HTML email for a radcliffe.run weekly email.
 * Uses table-based layout for broad email client compatibility.
 * Light background with radcliffe.run brand accents.
 */

export interface RunInfo {
  date: string        // ISO date string e.g. '2026-04-24'
  title: string
  distance_km: number | null
  description: string | null
  route_slug: string | null
  meeting_point: string
  on_tour: boolean
  terrain: string | null
}

export interface EmailData {
  subject:        string
  showOpening:    boolean
  openingText:    string
  runs:           RunInfo[]   // all runs for the Thursday date
  showRouteBlock: boolean
  customText:     string | null
  showClosing:    boolean
  closingText:    string
  siteUrl:        string      // e.g. 'https://radcliffe.run'
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function cleanTitle(title: string) {
  return title.replace(/^RTR\s+[58]k\s*/i, '').trim()
}

function nl2p(text: string): string {
  return text
    .split(/\n\n+/)
    .map(para => `<p style="margin:0 0 12px;font-size:15px;color:#333333;line-height:1.8;">${
      para.replace(/\n/g, '<br>')
    }</p>`)
    .join('\n')
}

function runBlock(run: RunInfo, siteUrl: string, showTerrain = false): string {
  const dateStr   = fmtDate(run.date)
  const title     = cleanTitle(run.title)
  const distance  = run.distance_km ? `${run.distance_km}km` : ''
  const location  = run.meeting_point || 'Radcliffe Market'
  const routeUrl  = run.route_slug
    ? `${siteUrl}/routes/${run.route_slug}`
    : `${siteUrl}/routes`

  const terrainMap: Record<string, string> = { trail: '🌿 Trail', road: '🏙️ Road', mixed: '🔀 Mixed' }
  const terrainLabel = (showTerrain && run.terrain) ? terrainMap[run.terrain] ?? '' : ''

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
  <tr>
    <td style="background:#f9f9f9;border-left:3px solid #f5a623;border-radius:0 6px 6px 0;padding:20px 24px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#f5a623;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        ${dateStr} &bull; 7pm${distance ? ` &bull; ${distance}` : ''}${terrainLabel ? ` &bull; ${terrainLabel}` : ''}
      </p>
      <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#0a0a0a;letter-spacing:-0.02em;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        ${title}
      </p>
      ${run.description ? `<p style="margin:0 0 14px;font-size:14px;color:#555555;line-height:1.7;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${run.description}</p>` : ''}
      <p style="margin:0 0 14px;font-size:13px;color:#777777;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        📍 ${location}${run.on_tour ? ' <strong style="color:#f5a623;">(On Tour)</strong>' : ''}
      </p>
      <a href="${routeUrl}"
         style="display:inline-block;padding:10px 20px;background:#f5a623;color:#0a0a0a;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        View route details &rarr;
      </a>
    </td>
  </tr>
</table>`
}

export function buildEmailHtml(data: EmailData): string {
  const {
    showOpening, openingText, runs, showRouteBlock,
    customText, showClosing, closingText, siteUrl,
  } = data

  const runBlocks = (showRouteBlock && runs.length > 0)
    ? runs.map(r => runBlock(r, siteUrl, runs.length > 1)).join('\n')
    : ''

  const openingSection = showOpening && openingText ? `
      <!-- Opening -->
      <tr>
        <td style="padding:32px 40px 8px;">
          ${nl2p(openingText)}
        </td>
      </tr>` : ''

  const routeSection = runBlocks ? `
      <!-- Run block -->
      <tr>
        <td style="padding:24px 40px;">
          ${runBlocks}
        </td>
      </tr>` : ''

  const customSection = customText && customText.trim() ? `
      <!-- Custom text -->
      <tr>
        <td style="padding:0 40px 24px;">
          ${nl2p(customText)}
        </td>
      </tr>` : ''

  const closingSection = showClosing && closingText ? `
      <!-- Closing -->
      <tr>
        <td style="padding:0 40px 32px;border-top:1px solid #eeeeee;">
          <div style="height:24px;"></div>
          ${nl2p(closingText)}
        </td>
      </tr>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${data.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;-webkit-text-size-adjust:100%;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f0f0;padding:32px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">

        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- ── Header ── -->
          <tr>
            <td style="padding:28px 40px 24px;border-bottom:3px solid #f5a623;">
              <a href="${siteUrl}" style="text-decoration:none;">
                <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0a0a0a;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  radcliffe.<span style="color:#f5a623;">run</span>
                </span>
              </a>
            </td>
          </tr>

          ${openingSection}
          ${routeSection}
          ${customSection}
          ${closingSection}

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:20px 40px;background:#f8f8f8;border-top:1px solid #eeeeee;">
              <p style="margin:0 0 4px;font-size:12px;color:#999999;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <a href="${siteUrl}" style="color:#f5a623;text-decoration:none;font-weight:600;">radcliffe.run</a>
                &nbsp;&bull;&nbsp; Every Thursday, 7pm &nbsp;&bull;&nbsp; Radcliffe Market, M26 2TN
              </p>
              <p style="margin:0;font-size:12px;color:#bbbbbb;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                You're receiving this because you're registered with Run Together Radcliffe.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
}

/** Plain-text fallback */
export function buildEmailText(data: EmailData): string {
  const { showOpening, openingText, runs, showRouteBlock, customText, showClosing, closingText, siteUrl } = data
  const lines: string[] = []

  if (showOpening && openingText) {
    lines.push(openingText, '')
  }

  if (showRouteBlock && runs.length > 0) {
    lines.push('─'.repeat(40))
    for (const run of runs) {
      const dateStr = fmtDate(run.date)
      lines.push(`${dateStr} · 7pm · ${run.distance_km ?? '?'}km`)
      lines.push(cleanTitle(run.title))
      if (run.description) lines.push('', run.description)
      lines.push(`📍 ${run.meeting_point}${run.on_tour ? ' (On Tour)' : ''}`)
      if (run.route_slug) lines.push(`Route: ${siteUrl}/routes/${run.route_slug}`)
      lines.push('')
    }
    lines.push('─'.repeat(40), '')
  }

  if (customText) {
    lines.push(customText, '')
  }

  if (showClosing && closingText) {
    lines.push(closingText, '')
  }

  lines.push('—', 'radcliffe.run · Every Thursday, 7pm · Radcliffe Market')
  return lines.join('\n')
}
