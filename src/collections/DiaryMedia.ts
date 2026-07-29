import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { isDiaryOwner } from '@/access/isDiaryOwner'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const DiaryMedia: CollectionConfig = {
  slug: 'diary-media',
  labels: {
    plural: 'Diary Media',
    singular: 'Diary Media',
  },
  access: {
    create: isDiaryOwner,
    delete: isDiaryOwner,
    read: isDiaryOwner,
    update: isDiaryOwner,
  },
  admin: {
    defaultColumns: ['filename', 'mimeType', 'updatedAt'],
    useAsTitle: 'filename',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../private/diary-media'),
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store')
      return headers
    },
  },
}
