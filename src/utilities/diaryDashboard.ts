export const MOODS = ['happy', 'calm', 'tired', 'anxious', 'sad', 'angry'] as const

export type Mood = (typeof MOODS)[number]

export type DiaryDashboardRecord = {
  entryDate?: string | null
  mood?: Mood | null
  status?: 'draft' | 'published' | null
}

export type Streak = {
  days: number
  end: string | null
  start: string | null
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

export const addDays = (day: string, amount: number): string => {
  const [year, month, date] = day.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, date + amount))

  return value.toISOString().slice(0, 10)
}

export const dayKey = (value: string | null | undefined): string | null => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString().slice(0, 10)
}

export const isDay = (value: string): boolean => {
  if (!DAY_PATTERN.test(value)) return false

  return addDays(value, 0) === value
}

export const currentDay = (): string => new Date().toISOString().slice(0, 10)

export const monthRange = (month: string): { end: string; start: string } => {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, monthNumber - 1, 1))
  const end = new Date(Date.UTC(year, monthNumber, 0))

  return {
    end: end.toISOString().slice(0, 10),
    start: start.toISOString().slice(0, 10),
  }
}

export const monthKey = (value: string): string | null => {
  if (!/^\d{4}-\d{2}$/.test(value)) return null

  const [year, month] = value.split('-').map(Number)
  if (month < 1 || month > 12) return null

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

export const shiftMonth = (month: string, amount: number): string => {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))

  return date.toISOString().slice(0, 7)
}

export const rangeDays = (start: string, end: string): number => {
  const startTime = Date.parse(`${start}T00:00:00.000Z`)
  const endTime = Date.parse(`${end}T00:00:00.000Z`)

  return Math.floor((endTime - startTime) / DAY_MS) + 1
}

const streakEndingAt = (days: Set<string>, end: string): Streak => {
  if (!days.has(end)) return { days: 0, end: null, start: null }

  let start = end
  let length = 1
  while (days.has(addDays(start, -1))) {
    start = addDays(start, -1)
    length += 1
  }

  return { days: length, end, start }
}

const streakStartingAt = (days: Set<string>, start: string): Streak => {
  let end = start
  let length = 1
  while (days.has(addDays(end, 1))) {
    end = addDays(end, 1)
    length += 1
  }

  return { days: length, end, start }
}

export const calculateStreaks = (entryDates: Array<string | null | undefined>, today = currentDay()) => {
  const days = new Set(entryDates.map(dayKey).filter((day): day is string => Boolean(day)))
  const current = streakEndingAt(days, days.has(today) ? today : addDays(today, -1))
  let longest: Streak = { days: 0, end: null, start: null }

  for (const day of [...days].sort()) {
    if (!days.has(addDays(day, -1))) {
      const streak = streakStartingAt(days, day)

      if (streak.days > longest.days) {
        longest = streak
      }
    }
  }

  return { current, longest }
}

export const calculateStats = (records: DiaryDashboardRecord[], start: string, end: string) => {
  const moods: Record<Mood, number> = Object.fromEntries(MOODS.map((mood) => [mood, 0])) as Record<
    Mood,
    number
  >
  let draftCount = 0
  let publishedCount = 0
  const days = new Set<string>()

  for (const record of records) {
    const date = dayKey(record.entryDate)
    if (date) days.add(date)
    if (record.status === 'draft') draftCount += 1
    if (record.status === 'published') publishedCount += 1
    if (record.mood && MOODS.includes(record.mood)) moods[record.mood] += 1
  }

  const totalDays = rangeDays(start, end)
  const entryCount = records.length

  return {
    draftCount,
    entryCount,
    moodCounts: moods,
    publishedCount,
    recordedDays: days.size,
    totalDays,
    completionRate: totalDays > 0 ? Math.round((days.size / totalDays) * 100) : 0,
  }
}
