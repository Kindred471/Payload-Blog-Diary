import { describe, expect, it } from 'vitest'

import { calculateStats, calculateStreaks, isDay, monthKey } from '@/utilities/diaryDashboard'

describe('Diary dashboard date calculations', () => {
  it('validates UTC day and month keys', () => {
    expect(isDay('2026-02-28')).toBe(true)
    expect(isDay('2026-02-30')).toBe(false)
    expect(monthKey('2026-07')).toBe('2026-07')
    expect(monthKey('2026-13')).toBeNull()
  })

  it('uses today or yesterday as the current streak endpoint and finds the longest streak', () => {
    const streaks = calculateStreaks(
      ['2025-12-30T00:00:00.000Z', '2025-12-31T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-04T00:00:00.000Z'],
      '2026-01-05',
    )

    expect(streaks.current).toEqual({ days: 1, end: '2026-01-04', start: '2026-01-04' })
    expect(streaks.longest).toEqual({ days: 3, end: '2026-01-01', start: '2025-12-30' })
  })

  it('counts range statistics and mood distribution without duplicate days', () => {
    expect(
      calculateStats(
        [
          { entryDate: '2026-07-01T00:00:00.000Z', mood: 'happy', status: 'draft' },
          { entryDate: '2026-07-02T00:00:00.000Z', mood: 'happy', status: 'published' },
        ],
        '2026-07-01',
        '2026-07-04',
      ),
    ).toMatchObject({
      completionRate: 50,
      draftCount: 1,
      entryCount: 2,
      moodCounts: { happy: 2 },
      publishedCount: 1,
      recordedDays: 2,
      totalDays: 4,
    })
  })
})
