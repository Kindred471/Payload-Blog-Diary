import type { CollectionConfig } from 'payload'

import { isDiaryOwner } from '@/access/isDiaryOwner'

export const DiaryAnnotations: CollectionConfig = {
  slug: 'diary-annotations',
  labels: {
    plural: 'Diary annotations',
    singular: 'Diary annotation',
  },
  access: {
    create: isDiaryOwner,
    delete: isDiaryOwner,
    read: isDiaryOwner,
    update: isDiaryOwner,
  },
  admin: {
    defaultColumns: ['selectedText', 'diary', 'createdAt'],
    useAsTitle: 'selectedText',
  },
  fields: [
    {
      name: 'diary',
      type: 'relationship',
      relationTo: 'diaries',
      required: true,
    },
    {
      name: 'comment',
      type: 'textarea',
      required: true,
    },
    {
      name: 'selectedText',
      type: 'textarea',
      required: true,
    },
    {
      name: 'prefix',
      type: 'textarea',
      defaultValue: '',
    },
    {
      name: 'suffix',
      type: 'textarea',
      defaultValue: '',
    },
  ],
}
