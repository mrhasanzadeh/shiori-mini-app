import type { MetadataRoute } from 'next'
import { getDb, hasDbConfig } from '@/lib/db'
import { siteConfig } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.siteUrl
  const staticPages: MetadataRoute.Sitemap = [{ url: base, lastModified: new Date() }]

  if (!hasDbConfig()) return staticPages

  try {
    const ids = await getDb().fetchAllAnimeIds()
    return [
      ...staticPages,
      ...ids.map((id) => ({
        url: `${base}/anime/${encodeURIComponent(String(id))}`,
        lastModified: new Date(),
      })),
    ]
  } catch {
    return staticPages
  }
}
