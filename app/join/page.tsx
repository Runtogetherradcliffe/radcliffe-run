import JoinForm from './JoinForm'

interface Props {
  searchParams: Promise<{ c25k?: string }>
}

export default async function JoinPage({ searchParams }: Props) {
  const params = await searchParams
  const isC25K = params.c25k === 'true'
  return <JoinForm isC25K={isC25K} />
}
