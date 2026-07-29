import configPromise from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { isDiaryOwner } from '@/access/isDiaryOwner'
import RichText from '@/components/RichText'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function DiaryDetail({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })
  const req = await createLocalReq({ user: user || undefined }, payload)
  const decodedSlug = decodeURIComponent(slug)
  const result = await payload.find({
    collection: 'diaries',
    depth: 1,
    draft: false,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    req,
    where: {
      and: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          slug: {
            equals: decodedSlug,
          },
        },
      ],
    },
  })
  const diary = result.docs[0]

  if (!diary) notFound()

  const owner = isDiaryOwner({ req })

  return (
    <main className="py-24">
      <article className="container max-w-[52rem]">
        <header className="prose dark:prose-invert max-w-none">
          {diary.entryDate && (
            <p className="text-muted-foreground">
              {new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' }).format(
                new Date(diary.entryDate),
              )}
            </p>
          )}
          <h1>{diary.title}</h1>
          <p>{diary.excerpt}</p>
        </header>
        {owner && diary.content ? (
          <RichText className="mt-10" data={diary.content} enableGutter={false} />
        ) : (
          <p className="mt-10 border-l-2 border-border pl-4 text-muted-foreground">
            This diary entry is available only to its owner.
          </p>
        )}
      </article>
    </main>
  )
}
