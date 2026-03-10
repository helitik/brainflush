import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useTaskImages, useImagePicker } from '../../hooks/useImages'
import { deleteImage, unprotectImage } from '../../lib/imageStore'
import { showToast } from '../../hooks/useToast'

export function TaskInput({ columnId }) {
  const addTask = useStore((s) => s.addTask)
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const [imageIds, setImageIds] = useState([])
  const imageIdsRef = useRef(imageIds)
  imageIdsRef.current = imageIds
  const taskImages = useTaskImages(imageIds)
  const { pickImages, pending: imagesPending } = useImagePicker()
  const textareaRef = useRef(null)

  // Unprotect any remaining images on unmount
  useEffect(() => {
    return () => {
      for (const id of imageIdsRef.current) unprotectImage(id)
    }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [text])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed && !imageIds.length) return
    for (const id of imageIds) unprotectImage(id)
    addTask(columnId, trimmed, imageIds)
    setText('')
    setImageIds([])
  }

  return (
    <div className="px-3 pb-2">
      {/* Image preview */}
      {imageIds.length > 0 && (
        <div className="flex gap-1.5 mb-1.5 overflow-x-auto no-scrollbar">
          {taskImages.map((img) => (
            <div key={img.id} className="relative shrink-0 w-12 h-12 rounded-md overflow-hidden" style={{ background: 'var(--bg-column)' }}>
              {img.url ? (
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>...</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setImageIds((prev) => prev.filter((i) => i !== img.id))
                  unprotectImage(img.id)
                  deleteImage(img.id).catch(() => {})
                }}
                className="absolute top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 items-end">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={t('taskInput.placeholder')}
          className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none overflow-hidden placeholder:text-[var(--text-muted)]"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary-400)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
        />
        <button
          type="button"
          disabled={imagesPending || imageIds.length >= 3}
          onClick={async () => {
            const { ids, errors } = await pickImages(imageIds.length)
            if (ids.length) setImageIds((prev) => [...prev, ...ids])
            if (errors.length) for (const err of new Set(errors)) showToast(t(`images.${err}`))
          }}
          className="p-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-40 shrink-0"
          style={{
            color: imageIds.length > 0 ? 'var(--color-primary-500)' : 'var(--text-muted)',
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
