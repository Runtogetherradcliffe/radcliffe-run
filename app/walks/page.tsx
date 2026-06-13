import Nav from '@/components/layout/Nav'
import WalksClient from './WalksClient'

export const metadata = {
  title: 'Walks in Radcliffe | radcliffe.run',
  description: 'Free, self-guided walking routes around Radcliffe and the Irwell Valley, Greater Manchester - with maps, distances, walking times and historic Ordnance Survey overlays.',
}

export default function WalksPage() {
  return (
    <>
      <Nav />
      <WalksClient />
    </>
  )
}
