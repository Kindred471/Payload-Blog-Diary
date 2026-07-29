export const DIARY_ANNOTATION_CONTEXT_LENGTH = 80

export type DiaryAnnotationAnchor = {
  prefix: string
  selectedText: string
  suffix: string
}

export const createDiaryAnnotationAnchor = (
  text: string,
  start: number,
  end: number,
): DiaryAnnotationAnchor | null => {
  if (start < 0 || end <= start || end > text.length) return null

  const selectedText = text.slice(start, end)
  if (!selectedText.trim()) return null

  return {
    prefix: text.slice(Math.max(0, start - DIARY_ANNOTATION_CONTEXT_LENGTH), start),
    selectedText,
    suffix: text.slice(end, end + DIARY_ANNOTATION_CONTEXT_LENGTH),
  }
}

export const findDiaryAnnotationOffset = (text: string, anchor: DiaryAnnotationAnchor): number | null => {
  if (!anchor.selectedText) return null

  let match: number | null = null
  let start = 0

  while (start <= text.length) {
    const index = text.indexOf(anchor.selectedText, start)
    if (index === -1) break

    const prefix = text.slice(Math.max(0, index - anchor.prefix.length), index)
    const suffix = text.slice(index + anchor.selectedText.length, index + anchor.selectedText.length + anchor.suffix.length)

    if (prefix === anchor.prefix && suffix === anchor.suffix) {
      if (match !== null) return null
      match = index
    }

    start = index + 1
  }

  return match
}
