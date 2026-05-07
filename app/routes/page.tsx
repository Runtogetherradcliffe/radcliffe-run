import Nav from '@/components/layout/Nav'
import RoutesClient from './RoutesClient'
import { getRouteOverrides } from '@/lib/routeDescriptions'

export const metadata = {
  title: 'Routes — radcliffe.run',
  description: 'Explore all 65+ RTR running routes around Radcliffe, Greater Manchester.',
}

export default async function RoutesPage() {
  const overrides = await getRouteOverrides()

  return (
    <>
      <Nav />
      <RoutesClient nameOverrides={overrides} />
    </>
  )
}
