import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { DiaryCard } from '@/components/DiaryCard'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function DiariesPage() {
  const payload = await getPayload({ config: configPromise })
  const diaries = await payload.find({
    collection: 'diaries',
    depth: 0,
    draft: false,
    limit: 12,
    overrideAccess: false,
    select: {
      entryDate: true,
      excerpt: true,
      slug: true,
      title: true,
    },
    sort: '-entryDate',
  })

  return (
    <main className="py-24">
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Diaries</h1>
        </div>
      </div>
      <div className="container mb-8">
        <PageRange
          collectionLabels={{ plural: 'Diaries', singular: 'Diary' }}
          currentPage={diaries.page}
          limit={12}
          totalDocs={diaries.totalDocs}
        />
      </div>
      <div className="container grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {diaries.docs.map((diary) => (
          <DiaryCard key={diary.id} doc={diary} />
        ))}
      </div>
      <div className="container">
        {diaries.totalPages > 1 && diaries.page && (
          <Pagination basePath="/diaries" page={diaries.page} totalPages={diaries.totalPages} />
        )}
      </div>
    </main>
  )
}

export const metadata: Metadata = {
  title: 'Diaries',
}
