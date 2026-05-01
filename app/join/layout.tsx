import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join radcliffe.run — Register for free',
  description: 'Register to join radcliffe.run, Radcliffe\'s free community running group. No memberships, no fees — just turn up on Thursday evenings.',
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
