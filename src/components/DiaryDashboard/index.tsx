import { Gutter } from '@payloadcms/ui'
import type { PayloadRequest } from 'payload'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { isDiaryOwner } from '@/access/isDiaryOwner'
import {
  addDays,
  calculateStats,
  calculateStreaks,
  currentDay,
  dayKey,
  isDay,
  monthKey,
  monthRange,
  MOODS,
  shiftMonth,
} from '@/utilities/diaryDashboard'

import './index.scss'

type SearchParams = Record<string, string | string[] | undefined>

type DiaryDashboardProps = {
  initPageResult: {
    req: PayloadRequest
  }
  searchParams?: SearchParams
}

const moodLabels = {
  angry: 'Angry',
  anxious: 'Anxious',
  calm: 'Calm',
  happy: 'Happy',
  sad: 'Sad',
  tired: 'Tired',
}

const value = (searchParams: SearchParams | undefined, key: string): string | undefined => {
  const result = searchParams?.[key]

  return Array.isArray(result) ? result[0] : result
}

const dashboardURL = (month: string, start: string, end: string): string => {
  const params = new URLSearchParams({ end, month, start })

  return `/admin/diary-dashboard?${params.toString()}`
}

const formatMonth = (month: string): string =>
  new Intl.DateTimeFormat('en-CA', { month: 'long', timeZone: 'UTC', year: 'numeric' }).format(
    new Date(`${month}-01T00:00:00.000Z`),
  )

const formatStreak = (start: string | null, end: string | null): string => {
  if (!start || !end) return 'No entries yet'
  if (start === end) return start

  return `${start} to ${end}`
}

export default async function DiaryDashboard({ initPageResult, searchParams }: DiaryDashboardProps) {
  const { req } = initPageResult
  if (!isDiaryOwner({ req })) notFound()

  const today = currentDay()
  const selectedMonth = monthKey(value(searchParams, 'month') || '') || today.slice(0, 7)
  const requestedStart = value(searchParams, 'start')
  const requestedEnd = value(searchParams, 'end')
  const defaultStart = addDays(today, -29)
  const defaultEnd = today
  const validStart = requestedStart && isDay(requestedStart) ? requestedStart : defaultStart
  const validEnd = requestedEnd && isDay(requestedEnd) ? requestedEnd : defaultEnd
  const rangeError = Boolean(requestedStart && requestedEnd && validStart > validEnd)
  const start = rangeError ? defaultStart : validStart
  const end = rangeError ? defaultEnd : validEnd
  const { start: monthStart, end: monthEnd } = monthRange(selectedMonth)

  const [monthResult, streakResult, statsResult] = await Promise.all([
    req.payload.find({
      collection: 'diaries',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      pagination: false,
      req,
      select: { _status: true, entryDate: true, title: true },
      sort: 'entryDate',
      where: {
        and: [
          { entryDate: { greater_than_equal: `${monthStart}T00:00:00.000Z` } },
          { entryDate: { less_than_equal: `${monthEnd}T23:59:59.999Z` } },
        ],
      },
    }),
    req.payload.find({
      collection: 'diaries',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      pagination: false,
      req,
      select: { entryDate: true },
    }),
    req.payload.find({
      collection: 'diaries',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      pagination: false,
      req,
      select: { _status: true, entryDate: true, mood: true },
      where: {
        and: [
          { entryDate: { greater_than_equal: `${start}T00:00:00.000Z` } },
          { entryDate: { less_than_equal: `${end}T23:59:59.999Z` } },
        ],
      },
    }),
  ])

  const monthDiaries = new Map(
    monthResult.docs.flatMap((diary) => {
      const entryDate = dayKey(diary.entryDate)

      return entryDate ? [[entryDate, diary] as const] : []
    }),
  )
  const streaks = calculateStreaks(streakResult.docs.map((diary) => diary.entryDate), today)
  const stats = calculateStats(
    statsResult.docs.map((diary) => ({
      entryDate: diary.entryDate,
      mood: diary.mood,
      status: diary._status,
    })),
    start,
    end,
  )
  const maxMoodCount = Math.max(...Object.values(stats.moodCounts), 1)
  const monthDays = Array.from({ length: Number(monthEnd.slice(-2)) }, (_, index) =>
    addDays(monthStart, index),
  )
  const firstWeekday = new Date(`${monthStart}T00:00:00.000Z`).getUTCDay()

  return (
    <Gutter className="diary-dashboard">
      <header className="diary-dashboard__header">
        <div>
          <h1>Diary dashboard</h1>
          <p>Browse entries, track your writing streak, and review a date range.</p>
        </div>
        <Link className="btn btn--style-primary btn--size-medium" href="/admin/collections/diaries/create">
          New diary
        </Link>
      </header>

      <section aria-labelledby="calendar-heading" className="diary-dashboard__section">
        <div className="diary-dashboard__section-header">
          <h2 id="calendar-heading">Calendar</h2>
          <div className="diary-dashboard__month-controls">
            <Link href={dashboardURL(shiftMonth(selectedMonth, -1), start, end)}>Previous</Link>
            <Link href={dashboardURL(today.slice(0, 7), start, end)}>Today</Link>
            <Link href={dashboardURL(shiftMonth(selectedMonth, 1), start, end)}>Next</Link>
          </div>
        </div>
        <p className="diary-dashboard__month-label">{formatMonth(selectedMonth)}</p>
        <div className="diary-dashboard__calendar" role="grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
            <div className="diary-dashboard__weekday" key={weekday} role="columnheader">
              {weekday}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, index) => (
            <div aria-hidden="true" className="diary-dashboard__day diary-dashboard__day--empty" key={`empty-${index}`} />
          ))}
          {monthDays.map((day) => {
            const diary = monthDiaries.get(day)
            const href = diary
              ? `/admin/collections/diaries/${diary.id}`
              : `/admin/collections/diaries/create?entryDate=${day}`

            return (
              <Link
                aria-label={diary ? `Edit ${diary.title || 'diary'} on ${day}` : `Create diary on ${day}`}
                className={`diary-dashboard__day${diary ? ' diary-dashboard__day--has-entry' : ''}${
                  diary?._status === 'published' ? ' diary-dashboard__day--published' : ''
                }`}
                href={href}
                key={day}
                role="gridcell"
              >
                <span>{Number(day.slice(-2))}</span>
                {diary && <small>{diary._status === 'published' ? 'Published' : 'Draft'}</small>}
              </Link>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="streak-heading" className="diary-dashboard__section">
        <h2 id="streak-heading">Writing streak</h2>
        <div className="diary-dashboard__metrics">
          <div className="diary-dashboard__metric">
            <span>Current</span>
            <strong>{streaks.current.days} days</strong>
            <small>{formatStreak(streaks.current.start, streaks.current.end)}</small>
          </div>
          <div className="diary-dashboard__metric">
            <span>Longest</span>
            <strong>{streaks.longest.days} days</strong>
            <small>{formatStreak(streaks.longest.start, streaks.longest.end)}</small>
          </div>
        </div>
      </section>

      <section aria-labelledby="statistics-heading" className="diary-dashboard__section">
        <div className="diary-dashboard__section-header">
          <h2 id="statistics-heading">Statistics</h2>
          <form className="diary-dashboard__range-form" method="get">
            <input name="month" type="hidden" value={selectedMonth} />
            <label>
              Start
              <input defaultValue={start} name="start" required type="date" />
            </label>
            <label>
              End
              <input defaultValue={end} name="end" required type="date" />
            </label>
            <button className="btn btn--style-primary btn--size-small" type="submit">
              Apply
            </button>
          </form>
        </div>
        {rangeError && <p className="diary-dashboard__error">Start date must not be after end date.</p>}
        <div className="diary-dashboard__metrics">
          <div className="diary-dashboard__metric"><span>Entries</span><strong>{stats.entryCount}</strong></div>
          <div className="diary-dashboard__metric"><span>Recorded days</span><strong>{stats.recordedDays}</strong></div>
          <div className="diary-dashboard__metric"><span>Days in range</span><strong>{stats.totalDays}</strong></div>
          <div className="diary-dashboard__metric"><span>Completion</span><strong>{stats.completionRate}%</strong></div>
          <div className="diary-dashboard__metric"><span>Drafts</span><strong>{stats.draftCount}</strong></div>
          <div className="diary-dashboard__metric"><span>Published</span><strong>{stats.publishedCount}</strong></div>
        </div>
        <div className="diary-dashboard__moods" aria-label="Mood distribution">
          {MOODS.map((mood) => (
            <div className="diary-dashboard__mood" key={mood}>
              <span>{moodLabels[mood]}</span>
              <div aria-hidden="true" className="diary-dashboard__mood-bar">
                <div style={{ width: `${(stats.moodCounts[mood] / maxMoodCount) * 100}%` }} />
              </div>
              <strong>{stats.moodCounts[mood]}</strong>
            </div>
          ))}
        </div>
      </section>
    </Gutter>
  )
}
