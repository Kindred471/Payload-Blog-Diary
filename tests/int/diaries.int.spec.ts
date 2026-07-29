import { createLocalReq, getPayload, Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Diary } from '@/payload-types'

const content: Diary['content'] = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Private diary content',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

describe('Diaries access control', () => {
  let payload: Payload
  let ownerID: number
  let outsiderID: number
  let slug: string
  let entryDate: string
  let previousOwnerID: string | undefined

  beforeAll(async () => {
    payload = await getPayload({ config })
    const suffix = Date.now()
    slug = `diary-access-${suffix}`
    entryDate = new Date(Date.UTC(2100, 0, 1 + (suffix % 1000))).toISOString()
    previousOwnerID = process.env.DIARY_OWNER_ID

    const owner = await payload.create({
      collection: 'users',
      data: {
        email: `diary-owner-${suffix}@example.test`,
        password: 'test-password',
      },
      overrideAccess: true,
    })
    const outsider = await payload.create({
      collection: 'users',
      data: {
        email: `diary-outsider-${suffix}@example.test`,
        password: 'test-password',
      },
      overrideAccess: true,
    })

    ownerID = owner.id
    outsiderID = outsider.id
    process.env.DIARY_OWNER_ID = String(ownerID)
  })

  afterAll(async () => {
    if (!payload) return

    await payload.delete({
      collection: 'diaries',
      context: {
        disableRevalidate: true,
      },
      overrideAccess: true,
      where: {
        slug: {
          equals: slug,
        },
      },
    })
    await payload.delete({ collection: 'users', id: ownerID, overrideAccess: true })
    await payload.delete({ collection: 'users', id: outsiderID, overrideAccess: true })

    if (previousOwnerID) {
      process.env.DIARY_OWNER_ID = previousOwnerID
    } else {
      delete process.env.DIARY_OWNER_ID
    }
  })

  it('shows published summaries publicly but keeps private fields owner-only', async () => {
    const owner = await payload.findByID({ collection: 'users', id: ownerID, overrideAccess: true })
    const outsider = await payload.findByID({ collection: 'users', id: outsiderID, overrideAccess: true })
    const ownerReq = await createLocalReq({ user: owner }, payload)
    const outsiderReq = await createLocalReq({ user: outsider }, payload)
    const anonymousReq = await createLocalReq({}, payload)

    const diary = await payload.create({
      collection: 'diaries',
      context: {
        disableRevalidate: true,
      },
      data: {
        _status: 'published',
        content,
        entryDate,
        excerpt: 'Public diary summary',
        slug,
        tags: [{ tag: 'private' }],
        title: 'Diary access test',
      },
      req: ownerReq,
      overrideAccess: false,
    })

    const publicResult = await payload.findByID({
      collection: 'diaries',
      id: diary.id,
      overrideAccess: false,
      req: anonymousReq,
    })
    const ownerResult = await payload.findByID({
      collection: 'diaries',
      id: diary.id,
      overrideAccess: false,
      req: ownerReq,
    })

    expect(publicResult.excerpt).toBe('Public diary summary')
    expect(publicResult.content).toBeUndefined()
    expect(publicResult.tags).toEqual([])
    expect(ownerResult.content).toEqual(content)
    expect(ownerResult.tags).toEqual([{ id: expect.any(String), tag: 'private' }])

    await expect(
      payload.update({
        collection: 'diaries',
        data: { title: 'Should not update' },
        id: diary.id,
        overrideAccess: false,
        req: outsiderReq,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'diaries',
        context: {
          disableRevalidate: true,
        },
        data: {
          _status: 'draft',
          content,
          entryDate,
          excerpt: 'Duplicate date',
          slug: `${slug}-duplicate`,
          title: 'Duplicate date',
        },
        overrideAccess: false,
        req: ownerReq,
      }),
    ).rejects.toThrow()

    const versions = await payload.findVersions({
      collection: 'diaries',
      overrideAccess: false,
      req: ownerReq,
      where: {
        parent: {
          equals: diary.id,
        },
      },
    })
    expect(versions.docs.length).toBeGreaterThan(0)
  })
})
