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

    // 上传到 Storage（≤5MB 原图直传，超过则压缩）
    if (userId && lineupId && slot) {
      setUploading(true)
      try {
        const BUCKET_LIMIT = 5 * 1024 * 1024 // 5MB
        const uploadFile = file.size <= BUCKET_LIMIT
          ? file  // 原图直传
          : await compressImage(file)  // 超过5MB才压缩

        const ext = file.size <= BUCKET_LIMIT ? (file.name.split('.').pop() || 'webp') : 'webp'
        const storageUrl = await uploadLineupImage(
          new File([uploadFile], `${slot}.${ext}`, { type: uploadFile.type }),
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
