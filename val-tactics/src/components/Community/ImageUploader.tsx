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
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 先用 FileReader 拿到 data URL（本地预览 + Storage 失败时兜底）
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setPreview(result)
        resolve(result)
      }
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })

    // 压缩 + 上传到 Storage（需要 userId + lineupId + slot）
    if (userId && lineupId && slot) {
      setUploading(true)
      try {
        const compressed = await compressImage(file)
        const storageUrl = await uploadLineupImage(
          new File([compressed], `${slot}.webp`, { type: 'image/webp' }),
          userId, lineupId, slot
        )
        if (storageUrl) {
          setPreview(storageUrl)
          onImage(storageUrl)
          return
        }
      } catch { console.error('[ImageUploader] 上传失败') }
      setUploading(false)
    }
    // Storage 不可用回退为 data URL
    if (dataUrl) onImage(dataUrl)
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
    </div>
  )
}
