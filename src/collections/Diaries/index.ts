import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { ValidationError } from 'payload'
import {
  BoldFeature,
  ItalicFeature,
  LinkFeature,
  ParagraphFeature,
  UnderlineFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { isDiaryOwner } from '../../access/isDiaryOwner'

const diaryTimeZone = 'Asia/Shanghai'
const moodOptions = [
  { label: '开心', value: 'happy' },
  { label: '平静', value: 'calm' },
  { label: '疲惫', value: 'tired' },
  { label: '焦虑', value: 'anxious' },
  { label: '难过', value: 'sad' },
  { label: '愤怒', value: 'angry' },
]

const diaryDay = (value: unknown): string | undefined => {
  if (typeof value !== 'string' && !(value instanceof Date)) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: diaryTimeZone,
    year: 'numeric',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
  const year = part('year')
  const month = part('month')
  const day = part('day')

  return year && month && day ? `${year}-${month}-${day}` : undefined
}

const diaryDate = (value: unknown): string | undefined => {
  const day = diaryDay(value)
  return day && `${day}T12:00:00.000Z`
}

const diaryTitle = (value: unknown): string => {
  const day = diaryDay(value)
  if (!day) return ''

  const [year, month, date] = day.split('-')
  return `${year} 年 ${Number(month)} 月 ${Number(date)} 日`
}

const normalizeTags = (tags: unknown) => {
  if (!Array.isArray(tags)) return tags

  const values = new Set<string>()
  return tags.flatMap((tag) => {
    if (!tag || typeof tag !== 'object' || !('tag' in tag) || typeof tag.tag !== 'string') return []

    const value = tag.tag.trim()
    if (!value || values.has(value)) return []

    values.add(value)
    return [{ ...tag, tag: value }]
  })
}

const validateDiary: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const entryDate = diaryDate(data.entryDate ?? originalDoc?.entryDate)

  if (entryDate) {
    data.entryDate = entryDate
    const existing = await req.payload.find({
      collection: 'diaries',
      limit: 1,
      overrideAccess: true,
      where: {
        entryDate: {
          equals: entryDate,
        },
      },
    })

    if (existing.docs.some((doc) => String(doc.id) !== String(originalDoc?.id))) {
      throw new ValidationError({
        collection: 'diaries',
        errors: [{ message: '该日期已有日记，请编辑已有日记。', path: 'entryDate' }],
      })
    }
  }

  if (data.tags) data.tags = normalizeTags(data.tags)
  return data
}

export const Diaries: CollectionConfig<'diaries'> = {
  slug: 'diaries',
  labels: {
    plural: '日记',
    singular: '日记',
  },
  access: {
    create: isDiaryOwner,
    delete: isDiaryOwner,
    read: isDiaryOwner,
    update: isDiaryOwner,
  },
  admin: {
    defaultColumns: ['title', 'entryDate', 'tags', 'updatedAt'],
    useAsTitle: 'title',
  },
  defaultSort: '-entryDate',
  fields: [
    {
      name: 'title',
      type: 'text',
      defaultValue: () => diaryTitle(new Date()),
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: [
                  ParagraphFeature(),
                  UnderlineFeature(),
                  BoldFeature(),
                  ItalicFeature(),
                  LinkFeature({ enabledCollections: [] }),
                ],
              }),
              label: false,
              required: true,
            },
          ],
          label: '正文',
        },
        {
          fields: [
            {
              name: 'entryDate',
              type: 'date',
              admin: {
                date: {
                  pickerAppearance: 'dayOnly',
                },
              },
              defaultValue: () => diaryDate(new Date()),
              required: true,
              unique: true,
            },
            {
              name: 'tags',
              type: 'array',
              fields: [
                {
                  name: 'tag',
                  type: 'text',
                  required: true,
                },
              ],
              label: '标签',
            },
            {
              name: 'mood',
              type: 'select',
              options: moodOptions,
            },
            {
              name: 'weather',
              type: 'text',
            },
            {
              name: 'location',
              type: 'text',
            },
          ],
          label: '记录信息',
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [validateDiary],
  },
  versions: {
    maxPerDoc: 50,
  },
}
