import { useState, useEffect } from 'react'
import { getComments, createComment, deleteComment } from '../../lib/community/comments'
import { getProfiles } from '../../lib/community/profiles'
import { useAuth } from '../../store/AuthContext'
import type { Comment, Profile } from '../../types/community'
import styles from './CommentSection.module.css'

interface Props {
  targetType: string
  targetId: string
  title?: string
}

export default function CommentSection({ targetType, targetId, title }: Props) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const data = await getComments(targetType, targetId)
      setComments(data)
      const ids = [...new Set(data.map(c => c.user_id))]
      if (ids.length > 0) {
        const profs = await getProfiles(ids)
        const map: Record<string, Profile> = {}
        profs.forEach(p => { map[p.id] = p })
        setProfiles(map)
      }
    } catch {}
  }

  useEffect(() => { load() }, [targetId])

  const handleSend = async () => {
    if (!input.trim() || !user) return
    setSending(true)
    setError('')
    try {
      await createComment({
        userId: user.id,
        targetType,
        targetId,
        content: input.trim(),
      })
      setInput('')
      load()
    } catch (e: any) {
      setError(e.message || '发送失败')
    }
    setSending(false)
  }

  const handleDelete = async (id: string) => {
    await deleteComment(id)
    load()
  }

  return (
    <div className={styles.section}>
      <div className={styles.title}>{title || '评论'} ({comments.length})</div>

      {user ? (
        <div>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              placeholder="写下你的评论…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
              maxLength={500}
            />
            <button className={styles.sendBtn} onClick={handleSend} disabled={sending || !input.trim()}>
              {sending ? '发送中' : '发送'}
            </button>
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      ) : (
        <div className={styles.loginHint}>登录后才能评论</div>
      )}

      {comments.length === 0 ? (
        <div className={styles.empty}>暂无评论</div>
      ) : (
        <div className={styles.list}>
          {comments.map(c => (
            <div key={c.id} className={styles.comment}>
              <div className={styles.commentUser}>{profiles[c.user_id]?.username?.split('@')[0] || '用户'}</div>
              <div className={styles.commentText}>{c.content}</div>
              <div className={styles.commentTime}>
                {new Date(c.created_at).toLocaleDateString('zh')}
                {user && user.id === c.user_id && (
                  <button onClick={() => handleDelete(c.id)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer', fontSize: 10 }}>删除</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
