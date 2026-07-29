import Link from 'next/link'
import React from 'react'

import { isDiaryOwnerUser } from '@/access/isDiaryOwner'

type DiaryDashboardNavLinkProps = {
  user?: {
    id: number | string
  } | null
}

export default function DiaryDashboardNavLink({ user }: DiaryDashboardNavLinkProps) {
  if (!isDiaryOwnerUser(user)) return null

  return (
    <Link className="nav__link" href="/admin/diary-dashboard" id="nav-diary-dashboard" prefetch={false}>
      <span className="nav__link-label">Diary dashboard</span>
    </Link>
  )
}
