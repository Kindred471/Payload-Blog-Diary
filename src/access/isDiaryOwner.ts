import type { AccessArgs } from 'payload'

export const isDiaryOwner = ({ req: { user } }: AccessArgs): boolean => {
  const ownerID = process.env.DIARY_OWNER_ID
  return Boolean(ownerID && user && String(user.id) === ownerID)
}
