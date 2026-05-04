'use client'
import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import { createClient } from '@/utils/supabase/client'

/* ── Types ── */
interface FormData {
  firstName: string
  lastName: string
  email: string
  mobile: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  healthDeclaration: boolean
  consentMedical: boolean
  healthNotes: string
  ageConfirmed: boolean
  consentData: boolean
  consentEmail: boolean
  consentPhoto: boolean
}

const EMPTY_FORM: FormData = {
  firstName: '', lastName: '', email: '', mobile: '',
  emergencyName: '', emergencyPhone: '', emergencyRelationship: '',
  healthDeclaration: false, consentMedical: false, healthNotes: '',
  ageConfirmed: false, consentData: false, consentEmail: false, consentPhoto: false,
}

const RELATIONSHIPS = ['Partner', 'Parent', 'Sibling', 'Friend', 'Spouse', 'Child', 'Other']

/* ── Email validation ── */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

function emailError(value: string): string | null {
  if (!value) return null
  return isValidEmail(value) ? null : 'Enter a valid email address (e.g. sarah@example.com)'
}

/* ── Phone validation ── */
function isValidUKPhone(value: string): boolean {
  if (!value) return false
  const digits = value.replace(/\D/g, '')
  // +44 format → 12 digits starting with 44 + 10-digit number
  if (digits.startsWith('44')) return digits.length === 12
  // 07xxx / 01xxx / 02xxx → 11 digits
  if (digits.startsWith('0')) return digits.length === 11
  return false
}

function phoneError(value: string): string | null {
  if (!value) return null // empty handled by required check
  return isValidUKPhone(value) ? null : 'Enter a valid UK phone number (e.g. 07700 900000)'
}

/* ── Shared input style ── */
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0a0a0a', border: '1px solid #222',
  borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff',
  fontFamily: 'Inter, sans-serif', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500, color: '#888',
  marginBottom: 6, letterSpacing: '0.02em',
}

function Input({ label, required, error, ...props }: { label: string; required?: boolean; error?: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  const hasError = !!error
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#f5a623', marginLeft: 3 }}>*</span>}</label>
      <input
        {...props}
        style={{
          ...inputStyle,
          borderColor: hasError ? '#e05252' : focused ? '#f5a623' : '#222',
          boxShadow: hasError ? '0 0 0 3px rgba(224,82,82,0.12)' : focused ? '0 0 0 3px rgba(245,166,35,0.1)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      />
      {hasError && (
        <p style={{ fontSize: 12, color: '#e05252', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="#e05252"/>
            <path d="M6 3.5v3M6 8.5v.01" stroke="#e05252" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

function Select({ label, required, children, ...props }: { label: string; required?: boolean } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#f5a623', marginLeft: 3 }}>*</span>}</label>
      <select
        {...props}
        style={{
          ...inputStyle,
          borderColor: focused ? '#f5a623' : '#222',
          boxShadow: focused ? '0 0 0 3px rgba(245,166,35,0.1)' : 'none',
          appearance: 'none', cursor: 'pointer',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {children}
      </select>
    </div>
  )
}

function ConsentItem({ checked, onChange, required, children }: {
  checked: boolean; onChange: (v: boolean) => void; required?: boolean; children: React.ReactNode
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
        background: checked ? 'rgba(245,166,35,0.06)' : 'transparent',
        border: checked ? '1px solid rgba(245,166,35,0.25)' : '1px solid #1a1a1a',
        transition: 'all 0.2s',
      }}
    >
      {/* Custom checkbox */}
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
        background: checked ? '#f5a623' : '#1a1a1a',
        border: checked ? '2px solid #f5a623' : '2px solid #333',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3.5 3.5L11 1" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 300, color: '#aaa', lineHeight: 1.6 }}>
        {children}
        {required && <span style={{ color: '#f5a623', marginLeft: 4, fontSize: 12 }}>Required</span>}
      </div>
    </div>
  )
}

/* ── Step indicator ── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done    = i < current
        const active  = i === current
        const inactive = i > current
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              background: done || active ? '#f5a623' : '#1a1a1a',
              color:      done || active ? '#0a0a0a' : '#555',
              border:     inactive ? '2px solid #222' : 'none',
              transition: 'all 0.3s',
            }}>
              {done ? (
                <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                  <path d="M1 6l4.5 4.5L13 1" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (i + 1)}
            </div>
            {i < total - 1 && (
              <div style={{ width: 56, height: 2, background: done ? '#f5a623' : '#222', transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Step 1: About you ── */
function StepAboutYou({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  const [emailBlurred,  setEmailBlurred]  = useState(false)
  const [mobileBlurred, setMobileBlurred] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="First name" required placeholder="Sarah" value={data.firstName} onChange={e => onChange('firstName', e.target.value)} />
        <Input label="Last name"  required placeholder="Jones"  value={data.lastName}  onChange={e => onChange('lastName',  e.target.value)} />
      </div>
      <Input
        label="Email address" required type="email" placeholder="sarah@example.com"
        value={data.email}
        onChange={e => onChange('email', e.target.value)}
        onBlur={() => setEmailBlurred(true)}
        error={emailBlurred && data.email ? emailError(data.email) : null}
      />
      <Input
        label="Mobile number" type="tel" placeholder="07700 900000"
        value={data.mobile}
        onChange={e => onChange('mobile', e.target.value)}
        onBlur={() => setMobileBlurred(true)}
        error={mobileBlurred && data.mobile ? phoneError(data.mobile) : null}
      />
      <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, paddingTop: 4 }}>
        If you&apos;d like to manage your profile or emergency contacts later, you can sign in with a one-time code sent to this email.
      </p>
    </div>
  )
}

/* ── Step 2: Emergency contact ── */
function StepEmergency({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  const [phoneBlurred, setPhoneBlurred] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#aaa', lineHeight: 1.6 }}>
          We only ask for this so we can contact someone if you&rsquo;re ever injured on a run. It&rsquo;s stored securely and only accessible to run leaders.
        </p>
      </div>
      <Input label="Their full name" required placeholder="James Jones" value={data.emergencyName} onChange={e => onChange('emergencyName', e.target.value)} />
      <Input
        label="Their phone number" required type="tel" placeholder="07700 900001"
        value={data.emergencyPhone}
        onChange={e => onChange('emergencyPhone', e.target.value)}
        onBlur={() => setPhoneBlurred(true)}
        error={phoneBlurred && data.emergencyPhone ? phoneError(data.emergencyPhone) : null}
      />
      <Select label="Relationship" required value={data.emergencyRelationship} onChange={e => onChange('emergencyRelationship', e.target.value)}>
        <option value="">Select relationship...</option>
        {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
      </Select>
    </div>
  )
}

/* ── Privacy policy modal ── */
function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640, height: '80vh',
          background: '#111', border: '1px solid #2a2a2a', borderRadius: 16,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #1e1e1e', flexShrink: 0,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#ccc' }}>Privacy Policy</p>
          <button
            onClick={onClose}
            style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
              fontSize: 16, lineHeight: 1, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
        {/* iframe body */}
        <iframe
          src="/privacy?modal=1"
          style={{ flex: 1, border: 'none', width: '100%' }}
          title="Privacy Policy"
        />
      </div>
    </div>
  )
}

/* ── Step 3: Last bits (health + GDPR) ── */
function StepLastBits({ data, onChange, onToggle }: {
  data: FormData
  onChange: (k: keyof FormData, v: string) => void
  onToggle: (k: keyof FormData, v: boolean) => void
}) {
  const [showPrivacy, setShowPrivacy] = useState(false)
  return (
    <>
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Health declaration */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Health</p>
        <ConsentItem checked={data.healthDeclaration} onChange={v => onToggle('healthDeclaration', v)}>
          I confirm I am in good health and aware of the physical demands of running. I take responsibility for my own safety during runs.
        </ConsentItem>
        {data.healthDeclaration && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ConsentItem checked={data.consentMedical} onChange={v => onToggle('consentMedical', v)}>
              I consent to radcliffe.run storing any health information I share below. This is used only for runner safety and is only accessible to run leaders.{' '}
              <span style={{ color: '#555', fontSize: 13 }}>(Optional — only tick if you want to share health details.)</span>
            </ConsentItem>
            {data.consentMedical && (
              <div>
                <label style={labelStyle}>Anything we should know?</label>
                <textarea
                  placeholder="E.g. asthma, recent injury, or anything that might be relevant..."
                  value={data.healthNotes}
                  onChange={e => onChange('healthNotes', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Age */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Age</p>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 10, padding: '10px 14px', background: '#0d0d0d', borderRadius: 8, border: '1px solid #1a1a1a' }}>
          Radcliffe.run is open to runners aged 18 and over. Young people aged 12–17 are welcome to join with a parent or guardian, who should complete this form on their behalf. Under 12s are unable to attend.
        </div>
        <ConsentItem required checked={data.ageConfirmed} onChange={v => onToggle('ageConfirmed', v)}>
          I confirm I am 18 or over, or I am a parent or guardian registering on behalf of a young person aged 12–17 who will attend with me.
        </ConsentItem>
      </div>

      {/* GDPR */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Your data</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ConsentItem required checked={data.consentData} onChange={v => onToggle('consentData', v)}>
            I agree to radcliffe.run storing my name, contact details, and emergency contact for the purpose of running group safety and communications.{' '}
            <button onClick={e => { e.stopPropagation(); setShowPrivacy(true) }} style={{ background: 'none', border: 'none', color: '#f5a623', textDecoration: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: 'inherit' }}>Privacy policy</button>
          </ConsentItem>
          <ConsentItem checked={data.consentEmail} onChange={v => onToggle('consentEmail', v)}>
            Send me club emails including weekly run reminders, the weekend roundup, and other club updates. (You can unsubscribe anytime.)
          </ConsentItem>
          <ConsentItem checked={data.consentPhoto} onChange={v => onToggle('consentPhoto', v)}>
            I&apos;m happy to appear in group photos shared on the radcliffe.run website and social media.
          </ConsentItem>
        </div>
      </div>
    </div>
    </>
  )
}

type NextRun = { title: string; date: string; meeting_point: string } | null

/* ── Step 4: Welcome ── */
function StepWelcome({ name, nextRun, onReset }: { name: string; nextRun: NextRun; onReset: () => void }) {
  const formatted = nextRun ? new Date(nextRun.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : null
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>💜</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
        Welcome, {name}!
      </h2>
      <p style={{ fontSize: 16, fontWeight: 300, color: '#aaa', lineHeight: 1.7, marginBottom: 32, maxWidth: 360, margin: '0 auto 32px' }}>
        You&apos;re all registered &mdash; we&apos;ll see you on Thursday!
      </p>

      {/* Next run card */}
      {nextRun && (
        <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>Next run</p>
          <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{nextRun.title}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--run-stats-cols)', gap: 16 }}>
            {[{ label: 'Date', value: formatted }, { label: 'Time', value: '7:00pm' }, { label: 'Meet', value: nextRun.meeting_point }].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/routes" style={{ display: 'inline-flex', alignItems: 'center', background: '#f5a623', color: '#0a0a0a', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 8, textDecoration: 'none', marginBottom: 16 }}>
        Explore the routes
      </Link>
      <p style={{ fontSize: 13, color: '#555' }}>
        <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, fontFamily: 'inherit' }}>
          Register another runner
        </button>
      </p>
    </div>
  )
}

/* ── STEP CONFIG ── */
const STEPS = [
  { label: 'About you',         subtitle: 'Tell us a bit about yourself.' },
  { label: 'Emergency contact', subtitle: 'Someone we can call if needed.' },
  { label: 'Last bits',         subtitle: 'Health and data preferences.' },
]

function isStepValid(step: number, data: FormData): boolean {
  if (step === 0) return !!(
    data.firstName && data.lastName &&
    data.email && isValidEmail(data.email) &&
    (!data.mobile || isValidUKPhone(data.mobile))
  )
  if (step === 1) return !!(
    data.emergencyName &&
    data.emergencyPhone && isValidUKPhone(data.emergencyPhone) &&
    data.emergencyRelationship
  )
  if (step === 2) return !!(data.consentData && data.healthDeclaration && data.ageConfirmed)
  return true
}

/* ── PAGE ── */
export default function JoinPage() {
  const [step,       setStep]       = useState(0)
  const [done,       setDone]       = useState(false)
  const [data,       setData]       = useState<FormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [nextRun,    setNextRun]    = useState<NextRun>(null)

  const update = (k: keyof FormData, v: string) => setData(d => ({ ...d, [k]: v }))
  const toggle = (k: keyof FormData, v: boolean) => setData(d => ({ ...d, [k]: v }))

  const handleContinue = async () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
      return
    }
    // Final step — submit to API
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong')
      // Fetch next upcoming run to show on the welcome screen
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const { data: run } = await supabase
        .from('runs')
        .select('title, date, meeting_point')
        .eq('run_type', 'regular')
        .eq('cancelled', false)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .single()
      setNextRun(run ?? null)
      setDone(true)
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => { setData(EMPTY_FORM); setStep(0); setDone(false); setSubmitError(null) }

  const valid = isStepValid(step, data)

  return (
    <>
      <Nav />
      <main style={{ minHeight: 'calc(100vh - 60px)', background: '#0a0a0a', padding: 'var(--join-outer-pad)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* Header */}
          {!done && (
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>
                Join radcliffe.run
              </p>
              <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
                {STEPS[step].label}
              </h1>
              <p style={{ fontSize: 15, fontWeight: 300, color: '#888' }}>{STEPS[step].subtitle}</p>
            </div>
          )}

          {/* Step indicator */}
          {!done && <StepIndicator current={step} total={STEPS.length} />}

          {/* Form card */}
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: 'var(--join-card-pad)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            {done ? (
              <StepWelcome name={data.firstName} nextRun={nextRun} onReset={handleReset} />
            ) : (
              <>
                {step === 0 && <StepAboutYou   data={data} onChange={update} />}
                {step === 1 && <StepEmergency  data={data} onChange={update} />}
                {step === 2 && <StepLastBits   data={data} onChange={update} onToggle={toggle} />}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 28, alignItems: 'center' }}>
                  {step > 0 && (
                    <button onClick={() => setStep(s => s - 1)} disabled={submitting} style={{ background: 'transparent', border: '1px solid #222', color: '#888', fontSize: 14, fontWeight: 500, padding: '11px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleContinue}
                    disabled={!valid || submitting}
                    style={{
                      flex: 1, background: valid && !submitting ? '#f5a623' : '#1a1a1a',
                      color: valid && !submitting ? '#0a0a0a' : '#333',
                      fontSize: 14, fontWeight: 700, padding: '12px 24px',
                      borderRadius: 8, border: 'none', cursor: valid && !submitting ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit', transition: 'all 0.2s',
                    }}
                  >
                    {submitting ? 'Submitting…' : step === STEPS.length - 1 ? 'Complete registration' : 'Continue'}
                  </button>
                </div>

                {/* Submit error */}
                {submitError && (
                  <p style={{ fontSize: 13, color: '#e05252', marginTop: 12, textAlign: 'center' }}>
                    ⚠️ {submitError}
                  </p>
                )}

                {/* Step counter */}
                <p style={{ textAlign: 'center', fontSize: 12, color: '#333', marginTop: 16 }}>
                  Step {step + 1} of {STEPS.length}
                </p>
              </>
            )}
          </div>

          {/* Already registered */}
          {!done && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#555', marginTop: 20 }}>
              Already registered? <Link href="/profile" style={{ color: '#888', textDecoration: 'underline' }}>Sign in</Link>
            </p>
          )}
        </div>
      </main>
    </>
  )
}
