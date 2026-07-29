import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

const getDiariesSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const siteURL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'
    const results = await payload.find({
      collection: 'diaries',
      depth: 0,
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: {
        slug: true,
        updatedAt: true,
      },
      where: {
        _status: {
          equals: 'published',
        },
      },
    })
    const dateFallback = new Date().toISOString()

    return results.docs
      .filter((diary) => Boolean(diary.slug))
      .map((diary) => ({
        loc: `${siteURL}/diaries/${diary.slug}`,
        lastmod: diary.updatedAt || dateFallback,
      }))
  },
  ['diaries-sitemap'],
  {
    tags: ['diaries-sitemap'],
  },
)

export async function GET() {
  return getServerSideSitemap(await getDiariesSitemap())
}
