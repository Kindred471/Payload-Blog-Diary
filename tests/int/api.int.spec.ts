import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { isDiaryOwner } from '@/access/isDiaryOwner'
import { Diaries } from '@/collections/Diaries'
import type { Diary } from '@/payload-types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
let ownerID: number | string
const originalOwnerID = process.env.DIARY_OWNER_ID

const content: NonNullable<Diary['content']> = {
  root: {
    children: [
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: '测试日记', type: 'text', version: 1 }],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'diaries',
      overrideAccess: true,
      where: { title: { contains: '测试日记' } },
    })

    if (ownerID) await payload.delete({ collection: 'users', id: ownerID, overrideAccess: true })
    if (originalOwnerID === undefined) delete process.env.DIARY_OWNER_ID
    else process.env.DIARY_OWNER_ID = originalOwnerID
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })

  it('limits every diary operation to the configured owner', async () => {
    const owner = await payload.create({
      collection: 'users',
      data: { email: `diary-owner-${Date.now()}@example.test`, password: 'test-password' },
      overrideAccess: true,
    })
    ownerID = owner.id
    process.env.DIARY_OWNER_ID = String(ownerID)

    expect(Diaries.access?.create).toBe(isDiaryOwner)
    expect(Diaries.access?.read).toBe(isDiaryOwner)
    expect(Diaries.access?.update).toBe(isDiaryOwner)
    expect(Diaries.access?.delete).toBe(isDiaryOwner)
    expect(isDiaryOwner({ req: { user: { id: ownerID } } } as never)).toBe(true)
    expect(isDiaryOwner({ req: { user: { id: 'not-the-owner' } } } as never)).toBe(false)
    expect(isDiaryOwner({ req: { user: undefined } } as never)).toBe(false)
  })

  it('normalizes dates, de-duplicates tags, and rejects duplicate dates', async () => {
    const diary = await payload.create({
      collection: 'diaries',
      data: {
        content,
        entryDate: '2026-07-28T00:00:00.000Z',
        tags: [{ tag: '工作' }, { tag: ' 工作 ' }, { tag: '阅读' }],
        title: '测试日记 1',
      },
      overrideAccess: true,
    })

    expect(diary.entryDate).toBe('2026-07-28T12:00:00.000Z')
    expect(diary.tags?.map(({ tag }) => tag)).toEqual(['工作', '阅读'])

    await expect(
      payload.create({
        collection: 'diaries',
        data: { content, entryDate: '2026-07-28', title: '测试日记 重复' },
        overrideAccess: true,
      }),
    ).rejects.toMatchObject({ data: { errors: [{ message: '该日期已有日记，请编辑已有日记。' }] } })
  })

  it('validates mood values and sorts by entry date descending', async () => {
    await payload.create({
      collection: 'diaries',
      data: { content, entryDate: '2026-07-27', mood: 'calm', title: '测试日记 2' },
      overrideAccess: true,
    })

    await expect(
      payload.create({
        collection: 'diaries',
        data: {
          content,
          entryDate: '2026-07-26',
          mood: 'cheerful' as never,
          title: '测试日记 无效心情',
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow()

    const result = await payload.find({
      collection: 'diaries',
      limit: 2,
      overrideAccess: true,
      where: { title: { contains: '测试日记' } },
    })
    expect(result.docs.map(({ title }) => title)).toEqual(['测试日记 1', '测试日记 2'])
  })
})
