import { useState, useRef } from 'react'
import { toLosslessWebP, uploadLineupImage } from '../../lib/community/lineups'
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

    // 预览秒出：blob URL，不等 FileReader
    const blobUrl = URL.createObjectURL(file)
    setPreview(blobUrl)

    // 上传到 Storage
    if (userId && lineupId && slot) {
      setUploading(true)
      try {
        // 统一转无损 WebP（原尺寸、像素100%一致、体积比PNG小40-60%）
        const webp = await toLosslessWebP(file)
        const storageUrl = await uploadLineupImage(
          new File([webp], `${slot}.webp`, { type: 'image/webp' }),
          userId, lineupId, slot
        )
        if (storageUrl) {
          URL.revokeObjectURL(blobUrl)
          setPreview(storageUrl)
          onImage(storageUrl)
          return
        }
      } catch { console.error('[ImageUploader] 上传失败') }
      setUploading(false)
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
    </div>
  )
}
