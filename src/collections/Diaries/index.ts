import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { diaryOwnerOrPublished, isDiaryOwner } from '@/access/isDiaryOwner'
import { revalidateDelete, revalidateDiary } from './hooks/revalidateDiary'

const moodOptions = [
  { label: 'Happy', value: 'happy' },
  { label: 'Calm', value: 'calm' },
  { label: 'Tired', value: 'tired' },
  { label: 'Anxious', value: 'anxious' },
  { label: 'Sad', value: 'sad' },
  { label: 'Angry', value: 'angry' },
]

export const Diaries: CollectionConfig = {
  slug: 'diaries',
  labels: {
    plural: 'Diaries',
    singular: 'Diary',
  },
  access: {
    create: isDiaryOwner,
    delete: isDiaryOwner,
    read: diaryOwnerOrPublished,
    readVersions: isDiaryOwner,
    update: isDiaryOwner,
  },
  defaultPopulate: {
    entryDate: true,
    excerpt: true,
    slug: true,
    title: true,
  },
  admin: {
    defaultColumns: ['title', 'entryDate', '_status', 'tags', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'content',
              type: 'richText',
              required: true,
              access: {
                read: isDiaryOwner,
              },
              editor: lexicalEditor({
                features: ({ rootFeatures }) => [
                  ...rootFeatures,
                  HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  UploadFeature({ enabledCollections: ['diary-media'] }),
                  FixedToolbarFeature(),
                  InlineToolbarFeature(),
                ],
              }),
            },
          ],
        },
        {
          label: 'Entry details',
          fields: [
            {
              name: 'excerpt',
              type: 'textarea',
              required: true,
            },
            {
              name: 'tags',
              type: 'array',
              access: {
                read: isDiaryOwner,
              },
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'tag',
                  type: 'text',
                  required: true,
                },
              ],
              validate: (value) => {
                if (!Array.isArray(value)) {
                  return true
                }

                const tags = value.map((row) =>
                  String((row as { tag?: unknown }).tag || '').trim().toLocaleLowerCase(),
                )
                return new Set(tags).size === tags.length || 'Tags must be unique.'
              },
            },
            {
              name: 'mood',
              type: 'select',
              access: {
                read: isDiaryOwner,
              },
              options: moodOptions,
            },
            {
              name: 'weather',
              type: 'text',
              access: {
                read: isDiaryOwner,
              },
            },
            {
              name: 'location',
              type: 'text',
              access: {
                read: isDiaryOwner,
              },
            },
          ],
        },
      ],
    },
    {
      name: 'entryDate',
      type: 'date',
      required: true,
      unique: true,
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        position: 'sidebar',
      },
    },
    slugField({
      position: 'sidebar',
    }),
  ],
  hooks: {
    afterChange: [revalidateDiary],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
