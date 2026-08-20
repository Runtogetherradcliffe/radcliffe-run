import type { Metadata } from 'next'

// The contact page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: 'Contact Us | radcliffe.run',
  description: 'Get in touch with Run Together Radcliffe - questions about our free Thursday runs in Radcliffe, Bury, joining the group, or anything else.',
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
