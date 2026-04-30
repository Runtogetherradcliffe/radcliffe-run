'use client'
import { useState } from 'react'

interface FaqItem {
  q: string
  a: string
}

const FAQS: FaqItem[] = [
  {
    q: 'Do I need to be a fast runner to join?',
    a: 'Not at all. We welcome runners of all abilities — from complete beginners to those training for marathons and ultras. Nobody gets left behind, and routes are offered at different distances each week so you can pick what suits you.',
  },
  {
    q: 'What is jeffing?',
    a: 'Jeffing is a run/walk training method — you alternate between running and walking at set intervals, rather than trying to run the whole way. It\'s a genuinely effective way to build fitness, reduce injury risk and make running more enjoyable when you\'re starting out. Our Get Me Started group uses this approach, and plenty of experienced runners jeff too — it\'s not just for beginners.',
  },
  {
    q: 'How much does it cost?',
    a: 'Nothing. It is completely free to attend. We\'re part of the England Athletics Run Together programme, which is built on the principle that running should be accessible to everyone.',
  },
  {
    q: 'What time and where do you meet?',
    a: 'We meet every Thursday at 7pm at Radcliffe Market, 11 Blackburn Street, Radcliffe, M26 1PN. Look for the runners outside the market — you can\'t miss us.',
  },
  {
    q: 'Do I need to book in advance?',
    a: 'No you do not need to book. For your own safety we\'d really appreciate it if you could register your contact details and the details of anyone to contact in an emergency. You can also opt to receive emails and alerts about the group if you wish.',
  },
  {
    q: 'What should I wear and bring?',
    a: 'Whatever you\'d normally run in. On Thursday evenings a hi-vis or reflective layer and lights are needed in autumn and winter. Hydrate before the run and bring water if it\'s particularly warm.',
  },
  {
    q: 'What distances do you run?',
    a: 'Thursday runs are offered at two distances most weeks. The Get Me Started and Keep Me Going groups cover 5–6k, while the Challenge Me group does 8–10k. We also organise occasional social runs that tend to be longer — anywhere from 10k to half marathon distance — and trail-focused. Check the upcoming runs on the homepage to see what\'s planned.',
  },
  {
    q: 'Is it just road running?',
    a: 'We do both road and trail. When we have lighter evenings we\'re on trails — in darker months we run on the road. Take a look at the route library to get a feel for where we go.',
  },
  {
    q: 'I\'m coming back from injury — is that okay?',
    a: 'Absolutely. Just let one of the run leaders know when you arrive and we\'ll make sure you\'re with a group that suits where you\'re at. There\'s no pressure to push harder than you should.',
  },
  {
    q: 'Can I add the group to my parkrun profile?',
    a: 'Yes — we\'d love that. Search for "Run Together Radcliffe" in the club section of your parkrun profile. It means your results show up in our weekly roundup and you\'re counted in the group\'s stats.',
  },
  {
    q: 'Are there social runs outside of Thursdays?',
    a: 'Yes, member-led social runs happen fairly regularly — usually on weekend mornings and often on trails. They\'re announced in the WhatsApp group and on the website. No booking needed, just show up.',
  },
]

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {FAQS.map((faq, i) => {
        const isOpen = open === i
        return (
          <div key={i} style={{
            background: isOpen ? '#111' : 'transparent',
            border: `1px solid ${isOpen ? '#2a2a2a' : '#1e1e1e'}`,
            borderRadius: 10,
            overflow: 'hidden',
            transition: 'background 0.2s, border-color 0.2s',
          }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', padding: '18px 20px', fontFamily: 'Inter, sans-serif',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: isOpen ? '#fff' : '#ccc', lineHeight: 1.4 }}>
                {faq.q}
              </span>
              <span style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                background: isOpen ? '#f5a623' : '#1a1a1a',
                border: `1px solid ${isOpen ? '#f5a623' : '#2a2a2a'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: isOpen ? '#0a0a0a' : '#555',
                transition: 'all 0.2s',
                transform: isOpen ? 'rotate(45deg)' : 'none',
              }}>
                +
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 20px 18px' }}>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8 }}>{faq.a}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
