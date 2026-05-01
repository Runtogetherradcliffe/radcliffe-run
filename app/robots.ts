import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/profile',
          '/leader',
          '/signin',
          '/unsubscribe',
          '/preview-login',
        ],
      },
    ],
    sitemap: 'https://radcliffe.run/sitemap.xml',
  }
}
