'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { MessageSquarePlus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import type { LexicalEditor } from 'lexical'

import {
  createDiaryAnnotationAnchor,
  findDiaryAnnotationOffset,
  type DiaryAnnotationAnchor,
} from '@/utilities/diaryAnnotations'

type Annotation = DiaryAnnotationAnchor & {
  comment: string
  createdAt: string
  id: number | string
}

type ResolvedAnnotation = Annotation & { range: Range }
type HoveredAnnotations = { annotations: ResolvedAnnotation[]; x: number; y: number }
type AnnotationButtonProps = { editor: LexicalEditor }
type HighlightRegistry = { delete(name: string): void; set(name: string, value: unknown): void }

const getSelectionAnchor = (editor: LexicalEditor): DiaryAnnotationAnchor | null => {
  const root = editor.getRootElement()
  const selection = window.getSelection()
  if (!root || !selection?.rangeCount) return null

  const range = selection.getRangeAt(0)
  if (range.collapsed || !root.contains(range.commonAncestorContainer)) return null

  const before = range.cloneRange()
  before.selectNodeContents(root)
  before.setEnd(range.startContainer, range.startOffset)
  const start = before.toString().length

  return createDiaryAnnotationAnchor(root.textContent || '', start, start + range.toString().length)
}

const rangeFromOffsets = (root: HTMLElement, start: number, end: number): Range | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let startNode: Text | null = null
  let endNode: Text | null = null
  let startOffset = 0
  let endOffset = 0
  let node: Text | null

  while ((node = walker.nextNode() as Text | null)) {
    const next = offset + node.data.length

    if (!startNode && start >= offset && start <= next) {
      startNode = node
      startOffset = start - offset
    }
    if (end >= offset && end <= next) {
      endNode = node
      endOffset = end - offset
      break
    }
    offset = next
  }

  if (!startNode || !endNode) return null

  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  return range
}

const AnnotationButton = ({ editor }: AnnotationButtonProps) => {
  const { id } = useDocumentInfo()

  const open = () => {
    const anchor = getSelectionAnchor(editor)
    if (!id || !anchor) return
    window.dispatchEvent(new CustomEvent<DiaryAnnotationAnchor>('diary-annotation-open', { detail: anchor }))
  }

  return (
    <button
      aria-label="Add annotation"
      className="toolbar-popup__button"
      disabled={!id}
      onClick={open}
      onMouseDown={(event) => event.preventDefault()}
      title={id ? 'Add annotation' : 'Save the diary before adding annotations'}
      type="button"
    >
      <MessageSquarePlus size={16} />
    </button>
  )
}

const DiaryAnnotationHighlights = () => {
  const [editor] = useLexicalComposerContext()
  const { id } = useDocumentInfo()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [hovered, setHovered] = useState<HoveredAnnotations | null>(null)
  const [unresolved, setUnresolved] = useState<Annotation[]>([])
  const [anchor, setAnchor] = useState<DiaryAnnotationAnchor | null>(null)
  const [comment, setComment] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const resolvedRef = useRef<ResolvedAnnotation[]>([])

  const loadAnnotations = useCallback(async () => {
    if (!id) {
      setAnnotations([])
      return
    }

    const response = await fetch(`/api/diary-annotations?where[diary][equals]=${id}&depth=0&limit=100&sort=-createdAt`)
    if (!response.ok) return

    const { docs } = (await response.json()) as { docs: Annotation[] }
    setAnnotations(docs)
  }, [id])

  useEffect(() => {
    void loadAnnotations()
    window.addEventListener('diary-annotations-changed', loadAnnotations)
    return () => window.removeEventListener('diary-annotations-changed', loadAnnotations)
  }, [loadAnnotations])

  useEffect(() => {
    const open = (event: Event) => {
      setAnchor((event as CustomEvent<DiaryAnnotationAnchor>).detail)
      setComment('')
      setError('')
    }

    window.addEventListener('diary-annotation-open', open)
    return () => window.removeEventListener('diary-annotation-open', open)
  }, [])

  const save = async () => {
    if (!id || !anchor || !comment.trim()) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch('/api/diary-annotations', {
        body: JSON.stringify({ diary: id, comment: comment.trim(), ...anchor }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!response.ok) throw new Error('Unable to save annotation')

      window.dispatchEvent(new Event('diary-annotations-changed'))
      setAnchor(null)
    } catch {
      setError('Unable to save annotation')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    const refresh = () => {
      const root = editor.getRootElement()
      const css = CSS as typeof CSS & { highlights?: HighlightRegistry }
      const HighlightConstructor = (window as Window & { Highlight?: new (...ranges: Range[]) => unknown }).Highlight
      if (!root) return

      const text = root.textContent || ''
      const resolved = annotations.flatMap((annotation) => {
        const start = findDiaryAnnotationOffset(text, annotation)
        const range = start === null ? null : rangeFromOffsets(root, start, start + annotation.selectedText.length)
        return range ? [{ ...annotation, range }] : []
      })
      const unresolvedAnnotations = annotations.filter((annotation) => !resolved.some(({ id }) => id === annotation.id))

      resolvedRef.current = resolved
      setUnresolved((previous) =>
        previous.length === unresolvedAnnotations.length && previous.every(({ id }, index) => id === unresolvedAnnotations[index]?.id)
          ? previous
          : unresolvedAnnotations,
      )
      if (css.highlights && HighlightConstructor) {
        css.highlights.set('diary-annotation', new HighlightConstructor(...resolved.map(({ range }) => range)))
      }
    }

    const frame = requestAnimationFrame(refresh)
    const unregister = editor.registerUpdateListener(() => requestAnimationFrame(refresh))
    return () => {
      cancelAnimationFrame(frame)
      unregister()
      ;(CSS as typeof CSS & { highlights?: HighlightRegistry }).highlights?.delete('diary-annotation')
    }
  }, [annotations, editor])

  useEffect(() => {
    const root = editor.getRootElement()
    if (!root) return

    const onMove = (event: MouseEvent) => {
      const matches = resolvedRef.current.filter(({ range }) =>
        Array.from(range.getClientRects()).some(
          (rect) => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom,
        ),
      )
      setHovered((previous) =>
        previous?.annotations.length === matches.length && previous.annotations.every(({ id }, index) => id === matches[index]?.id)
          ? previous
          : matches.length
            ? { annotations: matches, x: event.clientX + 12, y: event.clientY + 12 }
            : null,
      )
    }
    const onLeave = () => setHovered(null)

    root.addEventListener('mousemove', onMove)
    root.addEventListener('mouseleave', onLeave)
    return () => {
      root.removeEventListener('mousemove', onMove)
      root.removeEventListener('mouseleave', onLeave)
    }
  }, [editor])

  return (
    <>
      <style>{`
        ::highlight(diary-annotation) { background: color-mix(in srgb, #fbbf24 32%, transparent); }
        .diary-annotation-dialog { align-items: center; background: rgb(0 0 0 / .4); display: flex; inset: 0; justify-content: center; position: fixed; z-index: 1000; }
        .diary-annotation-dialog__panel { background: var(--theme-elevation-0); border-radius: 4px; box-shadow: 0 8px 24px rgb(0 0 0 / .25); max-width: 32rem; padding: 1rem; position: relative; width: calc(100vw - 2rem); }
        .diary-annotation-dialog textarea { box-sizing: border-box; display: block; margin-bottom: .75rem; resize: vertical; width: 100%; }
        .diary-annotation-dialog__close { position: absolute; right: .5rem; top: .5rem; }
        .diary-annotation-dialog__error { color: var(--theme-error-500); }
        .diary-annotation-tooltip { background: var(--theme-elevation-800); border-radius: 4px; color: var(--theme-elevation-0); max-width: 20rem; padding: .5rem .75rem; pointer-events: none; position: fixed; z-index: 999; }
        .diary-annotation-tooltip p { margin: 0; white-space: pre-wrap; }
        .diary-annotation-tooltip time { color: var(--theme-elevation-400); display: block; font-size: .75rem; margin-top: .25rem; }
        .diary-annotation-tooltip__item + .diary-annotation-tooltip__item { border-top: 1px solid var(--theme-elevation-600); margin-top: .5rem; padding-top: .5rem; }
        .diary-annotation-unresolved { color: var(--theme-error-500); font-size: .875rem; margin-top: .5rem; }
      `}</style>
      {hovered ? (
        <div className="diary-annotation-tooltip" style={{ left: hovered.x, top: hovered.y }}>
          {hovered.annotations.map((annotation) => (
            <div className="diary-annotation-tooltip__item" key={annotation.id}>
              <p>{annotation.comment}</p>
              <time>{new Date(annotation.createdAt).toLocaleDateString()}</time>
            </div>
          ))}
        </div>
      ) : null}
      {anchor ? (
        <div aria-modal="true" className="diary-annotation-dialog" role="dialog">
          <div className="diary-annotation-dialog__panel">
            <button aria-label="Close" className="diary-annotation-dialog__close" onClick={() => setAnchor(null)} type="button">
              <X size={16} />
            </button>
            <textarea autoFocus onChange={(event) => setComment(event.target.value)} placeholder="Comment" rows={5} value={comment} />
            {error ? <p className="diary-annotation-dialog__error">{error}</p> : null}
            <button disabled={!comment.trim() || isSaving} onClick={save} type="button">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}
      {unresolved.map((annotation) => (
        <p className="diary-annotation-unresolved" key={annotation.id}>
          {annotation.selectedText}: 需要重新关联
        </p>
      ))}
    </>
  )
}

export const DiaryAnnotationsFeatureClient = createClientFeature({
  plugins: [{ Component: DiaryAnnotationHighlights, position: 'belowContainer' }],
  toolbarInline: {
    groups: [
      {
        items: [{ Component: AnnotationButton, key: 'diaryAnnotation', order: 100 }],
        key: 'diaryAnnotation',
        order: 100,
        type: 'buttons',
      },
    ],
  },
})
