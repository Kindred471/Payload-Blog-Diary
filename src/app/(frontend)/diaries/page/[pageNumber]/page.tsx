import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import { DiaryCard } from '@/components/DiaryCard'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'

export const revalidate = 600

type Args = {
  params: Promise<{
    pageNumber: string
  }>
}

export default async function DiaryPage({ params: paramsPromise }: Args) {
  const { pageNumber } = await paramsPromise
  const page = Number(pageNumber)

  if (!Number.isInteger(page) || page < 2) notFound()

  const payload = await getPayload({ config: configPromise })
  const diaries = await payload.find({
    collection: 'diaries',
    depth: 0,
    draft: false,
    limit: 12,
    overrideAccess: false,
    page,
    select: {
      entryDate: true,
      excerpt: true,
      slug: true,
      title: true,
    },
    sort: '-entryDate',
  })

  if (page > diaries.totalPages && diaries.totalDocs > 0) notFound()

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

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const { totalDocs } = await payload.count({
    collection: 'diaries',
    overrideAccess: false,
    where: {
      _status: {
        equals: 'published',
      },
    },
  })
  const totalPages = Math.ceil(totalDocs / 12)

  return Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => ({
    pageNumber: String(index + 2),
  }))
}

export const metadata: Metadata = {
  title: 'Diaries',
}
