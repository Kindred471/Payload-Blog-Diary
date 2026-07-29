import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

export type DiaryCardData = {
  entryDate?: string | null
  excerpt?: string | null
  slug?: string | null
  title?: string | null
}

const formatEntryDate = (entryDate?: string | null) => {
  if (!entryDate) return null

  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(entryDate))
}

export const DiaryCard: React.FC<{ className?: string; doc: DiaryCardData }> = ({ className, doc }) => {
  const { entryDate, excerpt, slug, title } = doc

  if (!slug || !title) return null

  return (
    <article className={cn('border border-border rounded-lg bg-card p-4', className)}>
      {entryDate && <p className="mb-2 text-sm text-muted-foreground">{formatEntryDate(entryDate)}</p>}
      <h2 className="text-xl font-semibold">
        <Link href={`/diaries/${slug}`}>{title}</Link>
      </h2>
      {excerpt && <p className="mt-3 text-muted-foreground">{excerpt}</p>}
    </article>
  )
}
