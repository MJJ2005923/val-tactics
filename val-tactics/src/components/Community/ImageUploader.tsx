import { useState, useRef } from 'react'
import { compressImage, uploadLineupImage } from '../../lib/community/lineups'
import styles from './ImageUploader.module.css'

interface Props {
  hint: string
  onImage: (url: string) => void
  value?: string
  userId?: string
  lineupId?: string
  slot?: string
}

export default function ImageUploader({ hint, onImage, value, userId, lineupId, slot }: Props) {
  const [preview, setPreview] = useState(value || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    // 预览秒出：blob URL，不等 FileReader
    const blobUrl = URL.createObjectURL(file)
    setPreview(blobUrl)

    // 上传到 COS
    if (userId && lineupId && slot) {
      setUploading(true)
      try {
        // 统一压缩为 WebP — 快传优先
        const compressed = await compressImage(file, 300) // 目标~300KB
        const storageUrl = await uploadLineupImage(
          new File([compressed], `${slot}.webp`, { type: 'image/webp' }),
          userId, lineupId, slot
        )
        if (storageUrl) {
          URL.revokeObjectURL(blobUrl)
          setPreview(storageUrl)
          onImage(storageUrl)
          setUploading(false)
          return
        }
      } catch (e: any) {
        console.error('[ImageUploader]', e?.message || e)
        setError(e?.message || '上传失败')
      }
      // 上传失败 — 清除预览
      setUploading(false)
      URL.revokeObjectURL(blobUrl)
      setPreview('')
      onImage('')
    }
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.zone} ${preview ? styles.hasImage : ''} ${uploading ? styles.uploading : ''}`}
        onClick={() => !uploading && fileRef.current?.click()}>
        {preview ? (
          <>
            <img src={preview} alt="" />
            <button className={styles.clearBtn} onClick={(e) => {
              e.stopPropagation(); setPreview(''); onImage('')
            }}>x</button>
          </>
        ) : (
          <div className={styles.zoneHint}>{uploading ? '压缩上传中...' : hint}</div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className={styles.zoneInput} onChange={handleFile} />
      </div>
      {error && <div style={{ color: '#ff5555', fontSize: 10, marginTop: 4 }}>{error}</div>}
    </div>
  )
}
