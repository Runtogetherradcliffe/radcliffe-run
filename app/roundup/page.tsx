import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

// Legacy route. The old static roundup page (lib/roundup.ts) is gone - roundups
// now live in the `posts` table and render at /news/<slug>. Redirect here to the
// latest published roundup, falling back to the news index when there are none.
// Push notifications still deep-link to /roundup (see admin notify), so this
// route must keep resolving to the current roundup. Temporary (307) redirect on
// purpose: the target changes each week, so it must not be cached permanently.
export const dynamic = 'force-dynamic'

export default async function RoundupRedirect() {
  const { data: latest } = await supabaseAdmin()
    .from('posts')
    .select('slug, id')
    .eq('status', 'published')
    .eq('type', 'roundup')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  redirect(latest ? `/news/${latest.slug ?? latest.id}` : '/news')
}
