'use client'

import { useEffect, useState } from 'react'

interface Props {
  slug: string
  alt?: string
  style?: React.CSSProperties
  className?: string
}

/**
 * Renders a route map image that swaps between dark and light variants
 * based on the current site theme (data-theme attribute on <html>).
 * Dark: /route-maps/{slug}.webp
 * Light: /route-maps/light/{slug}.webp
 */
export default function ThemeMapImage({ slug, alt = '', style, className }: Props) {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const check = () =>
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light')
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const src = isLight
    ? `/route-maps/light/${slug}.webp`
    : `/route-maps/${slug}.webp`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} style={style} className={className} />
  )
}
