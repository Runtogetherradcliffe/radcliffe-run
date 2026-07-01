'use client'

/** "Open in maps" link that opens Apple Maps on iOS and Google Maps elsewhere. */
export default function DirectionsLink({
  googleMapsUrl,
  address,
  lat,
  lng,
  children,
  style,
}: {
  googleMapsUrl: string
  address: string
  lat?: number
  lng?: number
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    if (isIOS) {
      e.preventDefault()
      // Exact coordinates drop the pin in the right place; free-text address
      // search can geocode to the wrong nearby place.
      const appleUrl = lat !== undefined && lng !== undefined
        ? `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(address)}`
        : `https://maps.apple.com/?q=${encodeURIComponent(address)}`
      window.location.href = appleUrl
    }
    // Android and desktop: default href (Google Maps link) already opens the
    // native app on Android or maps.google.com in the browser elsewhere.
  }

  return (
    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={handleClick} style={style}>
      {children}
    </a>
  )
}
