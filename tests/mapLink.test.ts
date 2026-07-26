import { describe, it, expect } from 'vitest'
import { extractCoords } from '@/lib/mapLink'

// Where an on-tour meeting point actually opens. The sheet holds a Google Maps
// share link; the sync resolves it once into runs.meeting_lat/meeting_lng, and
// both the run page (DirectionsLink) and the native app open THOSE. So whatever
// this file picks out of the link is the pin a member drives to.
//
// The trap: a link made by searching a name carries two locations, the place and
// the map framing, and they are not the same point. Fixtures below are the real
// redirect targets of real links, not invented ones.

// https://maps.app.goo.gl/d1FUYuqmNVpsWUs99 - the market link on the home page.
// Framing -2.3279228, the hall itself -2.3253479: about 170 m apart.
const MARKET_PLACE_LINK =
  'https://www.google.co.uk/maps/place/Radcliffe+Market+Hall/@53.5584223,-2.3279228,17z/' +
  'data=!3m1!4b1!4m6!3m5!1s0x487ba59e3d8b5799:0x2805094b8d0204f7!8m2!3d53.5584223!4d-2.3253479' +
  '!16s%2Fg%2F11bytzrzw_?entry=tts'

// https://maps.app.goo.gl/FQ81rWx2MTFUMVcB8 - the 30 Jul on-tour meeting point,
// made by long-pressing the map, so there is only one location in it.
const CLIFTON_DROPPED_PIN =
  'https://www.google.co.uk/maps/search/53.539798,+-2.354730?entry=tts'

describe('extractCoords', () => {
  it('takes the place itself, not where the map happened to be framed', () => {
    // Regression: the framing pattern used to be tried first, which put this
    // pin ~170 m from the door of the market hall.
    expect(extractCoords(MARKET_PLACE_LINK)).toEqual({ lat: 53.5584223, lng: -2.3253479 })
  })

  it('reads a long-pressed pin exactly, keeping the + separator Google emits', () => {
    expect(extractCoords(CLIFTON_DROPPED_PIN)).toEqual({ lat: 53.539798, lng: -2.35473 })
  })

  it('still falls back to the map framing when a link carries no pin', () => {
    expect(extractCoords('https://www.google.com/maps/@53.6507706,-2.424673,17z'))
      .toEqual({ lat: 53.6507706, lng: -2.424673 })
  })

  it('reads a plain q= coordinate pair', () => {
    expect(extractCoords('https://maps.google.com/?q=53.5,-2.4')).toEqual({ lat: 53.5, lng: -2.4 })
  })

  it('returns null rather than guessing when there is no location in the link', () => {
    // A name on its own must not become a pin. The caller then falls back to a
    // meeting-point text search, which is honest about being approximate.
    expect(extractCoords('https://www.google.com/maps/place/Radcliffe+Market')).toBeNull()
    expect(extractCoords('')).toBeNull()
    expect(extractCoords('not a url')).toBeNull()
  })
})
