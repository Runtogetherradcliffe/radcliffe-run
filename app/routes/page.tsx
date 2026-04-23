import Nav from '@/components/layout/Nav'
import RoutesClient from './RoutesClient'

export const metadata = {
  title: 'Routes — radcliffe.run',
  description: 'Explore all 65+ RTR running routes around Radcliffe, Greater Manchester.',
}

export default function RoutesPage() {
  return (
    <>
      <Nav />
      <RoutesClient />
    </>
  )
}
