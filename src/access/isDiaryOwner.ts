import type { Access, AccessArgs } from 'payload'

type DiaryOwnerUser = {
  id: number | string
} | null | undefined

export const isDiaryOwnerUser = (user: DiaryOwnerUser): boolean => {
  const ownerID = process.env.DIARY_OWNER_ID

  return Boolean(ownerID && user && String(user.id) === ownerID)
}

export const isDiaryOwner = ({ req }: Pick<AccessArgs, 'req'>): boolean => {
  return isDiaryOwnerUser(req.user)
}

export const diaryOwnerOrPublished: Access = ({ req }) => {
  if (isDiaryOwner({ req })) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
