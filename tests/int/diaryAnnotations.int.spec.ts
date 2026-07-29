import { describe, expect, it } from 'vitest'

import { createDiaryAnnotationAnchor, findDiaryAnnotationOffset } from '@/utilities/diaryAnnotations'

describe('Diary annotation anchors', () => {
  it('only resolves an anchor when its surrounding text identifies one location', () => {
    const text = 'First note. Second note. First note.'
    const anchor = createDiaryAnnotationAnchor(text, 12, 23)

    expect(anchor).not.toBeNull()
    expect(findDiaryAnnotationOffset(text, anchor!)).toBe(12)
    expect(findDiaryAnnotationOffset('First note. First note.', anchor!)).toBeNull()
  })

  it('keeps overlapping anchors independent and marks changed text unresolved', () => {
    const text = 'abcdefgh'
    const first = createDiaryAnnotationAnchor(text, 1, 5)
    const second = createDiaryAnnotationAnchor(text, 3, 7)

    expect(findDiaryAnnotationOffset(text, first!)).toBe(1)
    expect(findDiaryAnnotationOffset(text, second!)).toBe(3)
    expect(findDiaryAnnotationOffset('abcefgh', first!)).toBeNull()
    expect(findDiaryAnnotationOffset('', second!)).toBeNull()
  })
})
