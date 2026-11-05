/** The RTR iPhone app on the App Store (unlisted, released 5 Nov 2026). The URL
 * is where the site's iPhone install prompt sends people. Safari's Smart App
 * Banner (`itunes: { appId: IOS_APP_ID }` in app/layout.tsx metadata) was tried
 * and held back on 5 Nov: on staging it flashed empty and dismissed itself (a
 * known Apple issue; possibly the brand-new or unlisted app) - retry later. There is no public
 * Android app yet (Play internal track only), so Android keeps the PWA install. */
export const IOS_APP_ID = '6788440560'
export const IOS_APP_URL = `https://apps.apple.com/gb/app/radcliffe-run/id${IOS_APP_ID}`
