import { useState, useRef } from 'react'
import styles from './ImageUploader.module.css'

interface Props {
  hint: string
  onImage: (url: string) => void
  value?: string
}

export default function ImageUploader({ hint, onImage, value }: Props) {
  const [url, setUrl] = useState(value || '')
  const [preview, setPreview] = useState(value || '')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 对于本地文件，转 data URL 预览（Storage 上传可后续接入）
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      onImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleUrl = (u: string) => {
    setUrl(u)
    if (u.trim()) { setPreview(u); onImage(u) }
    else { setPreview(''); onImage('') }
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.zone} ${preview ? styles.hasImage : ''}`} onClick={() => fileRef.current?.click()}>
        {preview ? (
          <>
            <img src={preview} alt="" />
            <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); setPreview(''); setUrl(''); onImage('') }}>x</button>
          </>
        ) : (
          <div className={styles.zoneHint}>{hint}<br />点击上传图</div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className={styles.zoneInput} onChange={handleFile} />
      </div>
      <input className={styles.urlInput} placeholder="或粘贴图片URL" value={url} onChange={e => handleUrl(e.target.value)} />
    </div>
  )
}
