import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // config options here
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Fonts — cache-first, permanent
      {
        urlPattern: /\/fonts\/.+\.ttf$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      // Route map images — cache-first, 30 days
      {
        urlPattern: /\/route-maps\/.+\.png$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "route-map-images",
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // CartoDB map tiles — stale-while-revalidate, 7 days
      {
        urlPattern: /https:\/\/[a-d]\.basemaps\.cartocdn\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "map-tiles",
          expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      // GPX files — stale-while-revalidate, 7 days
      {
        urlPattern: /\/gpx\/.+\.gpx$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "gpx-files",
          expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      // Supabase API — network-first (always try live data)
      {
        urlPattern: /https:\/\/.*\.supabase\.co\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-data",
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
    ],
  },
})(nextConfig);
