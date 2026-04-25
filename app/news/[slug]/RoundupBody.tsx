'use client'

/**
 * RTR-styled markdown renderer for roundup posts.
 *
 * Supported markdown:
 *   ## 🏃 Parkrun          → orange section header
 *   ## 🏅 Races             → orange section header
 *   ## 🏕️ Trail / Social    → purple section header (h2 containing trail/social/walk)
 *   **Saturday 12 April**   → day label inside races section
 *   ### Venue / Race name   → card (amber left-border for parkrun, plain border for races, purple for trail)
 *   Regular paragraphs      → body text
 */

import { marked, Token } from 'marked'
import { useMemo } from 'react'

type Section = 'parkrun' | 'races' | 'trail' | 'other'

function sectionOf(text: string): Section {
  const t = text.toLowerCase()
  if (t.includes('parkrun'))              return 'parkrun'
  if (t.includes('race') || t.includes('result')) return 'races'
  if (t.includes('trail') || t.includes('social') || t.includes('walk') || t.includes('tour')) return 'trail'
  return 'other'
}

function isDayLabel(text: string) {
  return /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(text.trim())
}

export default function RoundupBody({ content }: { content: string }) {
  const tokens = useMemo(() => marked.lexer(content), [content])

  let currentSection: Section = 'other'
  const elements: React.ReactNode[] = []

  tokens.forEach((token: Token, i: number) => {
    if (token.type === 'heading' && token.depth === 2) {
      currentSection = sectionOf(token.text)
      const isTrail = currentSection === 'trail'
      elements.push(
        <h2 key={i} style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: isTrail ? '#c4a8e8' : '#f5a623',
          marginBottom: 20, marginTop: elements.length > 0 ? 44 : 0,
          paddingBottom: 10,
          borderBottom: `1px solid ${isTrail ? '#1e1e3a' : '#1e1e1e'}`,
        }}>
          {token.text}
        </h2>
      )
      return
    }

    if (token.type === 'heading' && token.depth === 3) {
      const cardStyle = currentSection === 'parkrun'
        ? { background: '#111', borderLeft: '3px solid #f5a623', borderRadius: '0 8px 8px 0', padding: '16px 20px', marginBottom: 12 }
        : currentSection === 'trail'
        ? { background: '#0f0f1a', borderLeft: '3px solid #7c5cbf', border: '1px solid #1e1e3a', borderRadius: '0 8px 8px 0', padding: '16px 20px', marginBottom: 12 }
        : { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }

      const h3Color = currentSection === 'trail' ? '#c4a8e8' : '#fff'

      // Peek ahead for the next paragraph(s) belonging to this card
      const cardParagraphs: React.ReactNode[] = []
      let j = i + 1
      while (j < tokens.length && tokens[j]?.type === 'paragraph') {
        const pToken = tokens[j] as { type: 'paragraph'; text: string }
        cardParagraphs.push(
          <p key={j} style={{ fontSize: 14, color: '#bbb', lineHeight: 1.8, margin: 0 }}
             dangerouslySetInnerHTML={{ __html: inlineHtml(pToken.text) }} />
        )
        j++
      }

      elements.push(
        <div key={i} style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: h3Color, marginBottom: cardParagraphs.length ? 10 : 0 }}>
            {token.text}
          </h3>
          {cardParagraphs}
        </div>
      )

      // Mark the consumed paragraphs so we skip them below
      for (let k = i + 1; k < j; k++) {
        (tokens[k] as any).__consumed = true
      }
      return
    }

    // Skip paragraphs already consumed by a card above
    if (token.type === 'paragraph' && (token as any).__consumed) return

    if (token.type === 'paragraph') {
      const text = token.text.trim()

      // Bold-only paragraph → treat as day label inside races section
      const boldOnly = /^\*\*(.+)\*\*$/.exec(text)
      if (boldOnly && isDayLabel(boldOnly[1])) {
        elements.push(
          <p key={i} style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: '#f5a623',
            marginBottom: 12, marginTop: 24,
          }}>
            {boldOnly[1]}
          </p>
        )
        return
      }

      // Regular paragraph (section intro etc.)
      elements.push(
        <p key={i} style={{ fontSize: 14, color: '#bbb', lineHeight: 1.85, marginBottom: 16 }}
           dangerouslySetInnerHTML={{ __html: inlineHtml(text) }} />
      )
      return
    }

    if (token.type === 'hr') {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #1a1a1a', margin: '32px 0' }} />)
    }
  })

  return <div>{elements}</div>
}

/** Convert markdown inline syntax (bold, italic, links) to HTML safely */
function inlineHtml(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#ddd;font-weight:600">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#f5a623;text-decoration:none" target="_blank" rel="noopener">$1</a>')
}
