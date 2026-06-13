import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './FollowListPopup.module.css'

interface Props {
  userId: string
  type: 'followers' | 'following'
  onClose: () => void
  onViewProfile?: (id: string) => void
}

export default function FollowListPopup({ userId, type, onClose, onViewProfile }: Props) {
  const [users, setUsers] = useState<{ id: string; username: string; avatar_url?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const col = type === 'followers' ? 'following_id' : 'follower_id'
      const join = type === 'followers' ? 'follower_id' : 'following_id'
      const { data } = await supabase.from('follows').select(`${join}`).eq(col, userId).limit(50)
      if (data?.length) {
        const ids = data.map((d: any) => d[join])
        const { data: profs } = await supabase.from('profiles').select('id,username,avatar_url').in('id', ids)
        setUsers((profs || []).map(p => ({ id: p.id, username: p.username?.split('@')[0] || '用户', avatar_url: p.avatar_url })))
      }
      setLoading(false)
    })()
  }, [userId, type])

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{type === 'followers' ? '粉丝' : '关注'} ({users.length})</span>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>{type === 'followers' ? '还没有粉丝' : '还没有关注任何人'}</div>
        ) : (
          <div className={styles.list}>
            {users.map(u => (
              <div key={u.id} className={styles.user}
                onClick={() => { onClose(); onViewProfile?.(u.id) }}>
                <span className={styles.avatar}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" /> : (u.username[0] || '?')}
                </span>
                <span className={styles.name}>{u.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
