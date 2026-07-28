import type { CollectionConfig } from 'payload'

import { isDiaryOwner } from '../../access/isDiaryOwner'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: isDiaryOwner,
    create: () => false,
    delete: isDiaryOwner,
    read: isDiaryOwner,
    update: isDiaryOwner,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
  ],
  timestamps: true,
}
