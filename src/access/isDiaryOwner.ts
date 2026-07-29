import type { Access, AccessArgs } from 'payload'

export const isDiaryOwner = ({ req }: Pick<AccessArgs, 'req'>): boolean => {
  const ownerID = process.env.DIARY_OWNER_ID

  return Boolean(ownerID && req.user && String(req.user.id) === ownerID)
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
