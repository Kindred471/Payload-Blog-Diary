import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'
import { Card } from '@/components/Card'
import { DiaryCard } from '@/components/DiaryCard'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: query } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })

  const results = await payload.find({
    collection: 'search',
    depth: 1,
    limit: 12,
    select: {
      doc: true,
      entryDate: true,
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
    // pagination: false reduces overhead if you don't need totalDocs
    pagination: false,
    ...(query
      ? {
          where: {
            or: [
              {
                title: {
                  like: query,
                },
              },
              {
                'meta.description': {
                  like: query,
                },
              },
              {
                'meta.title': {
                  like: query,
                },
              },
              {
                slug: {
                  like: query,
                },
              },
            ],
          },
        }
      : {}),
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Search</h1>

          <div className="max-w-[50rem] mx-auto">
            <Search />
          </div>
        </div>
      </div>

      {results.totalDocs > 0 ? (
        <div className="container grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.docs.map((result) => {
            if (result.doc.relationTo === 'diaries') {
              return (
                <DiaryCard
                  key={result.id}
                  doc={{
                    entryDate: result.entryDate,
                    excerpt: result.meta?.description,
                    slug: result.slug,
                    title: result.title,
                  }}
                />
              )
            }

            return <Card key={result.id} doc={result as CardPostData} relationTo="posts" showCategories />
          })}
        </div>
      ) : (
        <div className="container">No results found.</div>
      )}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Payload Website Template Search`,
  }
}
