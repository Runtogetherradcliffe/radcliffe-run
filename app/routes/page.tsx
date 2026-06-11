import Nav from '@/components/layout/Nav'
import RoutesClient from './RoutesClient'
import { getRouteOverrides } from '@/lib/routeDescriptions'

export const metadata = {
  title: 'Running Routes in Radcliffe, Bury | radcliffe.run',
  description: 'Explore our free library of running and walking routes around Radcliffe, Bury, Greater Manchester - with maps, distances and GPX downloads.',
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
