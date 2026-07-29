import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

const revalidateDiaryArchives = () => {
  revalidatePath('/diaries', 'layout')
  revalidateTag('diaries-sitemap', 'max')
}

export const revalidateDiary: CollectionAfterChangeHook = ({ doc, previousDoc, req: { context } }) => {
  if (context.disableRevalidate) {
    return doc
  }

  revalidateDiaryArchives()

  if (doc._status === 'published' && doc.slug) {
    revalidatePath(`/diaries/${doc.slug}`)
  }

  if (previousDoc?._status === 'published' && previousDoc.slug) {
    revalidatePath(`/diaries/${previousDoc.slug}`)
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateDiaryArchives()

    if (doc.slug) {
      revalidatePath(`/diaries/${doc.slug}`)
    }
  }

  return doc
}
