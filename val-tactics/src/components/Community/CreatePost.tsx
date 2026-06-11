import { useState } from 'react'
import { createPost } from '../../lib/community/posts'
import { useAuth } from '../../store/AuthContext'
import type { PostCategory } from '../../types/community'
import { POST_CATEGORIES } from '../../types/community'
import styles from './CreatePost.module.css'

interface Props {
  onClose: () => void
  onSuccess: (id: string) => void
}

export default function CreatePost({ onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [cat, setCat] = useState<PostCategory>('discussion')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!user) { setError('请先登录'); return }
    if (!title.trim()) { setError('请输入标题'); return }
    if (!content.trim()) { setError('请输入内容'); return }
    // 快速字数限制
    if (content.length > 5000) { setError('内容不能超过5000字'); return }
    setSending(true)
    setError('')
    try {
      // 走内容审核
      const check = await fetch('/api/content-filter', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: title + '\n' + content }),
      })
      const result = await check.json()
      if (!result.allowed) { setError(result.reason || '内容违规'); setSending(false); return }

      const post = await createPost({ userId: user.id, title: title.trim(), content: content.trim(), category: cat })
      if (post) {
        onSuccess(post.id)
      } else {
        setError('发布失败，请重试')
      }
    } catch (e: any) { setError(e.message || '发布失败') }
    setSending(false)
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel}>
        <div className={styles.title}>发布帖子</div>
        <div className={styles.field}>
          <div className={styles.label}>分类</div>
          <select className={styles.select} value={cat} onChange={e => setCat(e.target.value as PostCategory)}>
            {Object.entries(POST_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <div className={styles.label}>标题</div>
          <input className={styles.input} placeholder="帖子标题..." value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
        </div>
        <div className={styles.field}>
          <div className={styles.label}>内容</div>
          <textarea className={styles.textarea} placeholder="分享你的战术心得..." value={content} onChange={e => setContent(e.target.value)} maxLength={5000} />
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>取消</button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={sending || !user}>
            {sending ? '发布中...' : '发布'}
          </button>
        </div>
      </div>
    </div>
  )
}
