import { useState, useEffect, useCallback } from 'react'
import { getNotifications, getUnreadCount, markAsRead } from '../../lib/community/notifications'
import { getProfiles } from '../../lib/community/profiles'
import { useAuth } from '../../store/AuthContext'
import type { Notification, Profile } from '../../types/community'

export default function NotificationBell() {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Notification[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})

  const loadUnread = useCallback(async () => {
    if (!user) return
    const n = await getUnreadCount(user.id)
    setUnread(n)
  }, [user])

  useEffect(() => { loadUnread(); const t = setInterval(loadUnread, 30000); return () => clearInterval(t) }, [loadUnread])

  const handleOpen = async () => {
    if (!user) return
    if (!open) {
      const data = await getNotifications(user.id)
      setList(data)
      const ids = [...new Set(data.map(d => d.from_user_id))]
      const profs = await getProfiles(ids)
      const map: Record<string, Profile> = {}
      profs.forEach(p => { map[p.id] = p })
      setProfiles(map)
    }
    setOpen(!open)
    if (unread > 0) {
      await markAsRead(user.id)
      setUnread(0)
    }
  }

  const typeLabel: Record<string, string> = { like: '赞了', comment: '评论了', follow: '关注了' }
  const typeTarget: Record<string, (n: Notification) => string> = {
    like: n => n.target_type === 'tactic' ? '你的战术' : '你的帖子',
    comment: _n => '你的内容',
    follow: () => '你',
  }

  if (!user) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          background: 'none', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8,
          color: unread > 0 ? '#E349ED' : 'rgba(255,255,255,.3)', cursor: 'pointer',
          padding: '5px 8px', fontSize: 14, position: 'relative',
        }}
      >
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#E349ED', color: '#fff', borderRadius: '50%',
            width: 16, height: 16, fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
        通知
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 36, right: 0, width: 320, maxHeight: 400, overflow: 'auto',
            background: '#0d0a14', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12,
            zIndex: 9998, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)' }}>
              通知 {unread > 0 && `(${unread}条未读)`}
            </div>
            {list.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,.1)', fontSize: 13 }}>暂无通知</div>
            ) : (
              list.map(n => (
                <div key={n.id} style={{
                  padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.02)',
                  fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.6,
                  background: n.read ? 'transparent' : 'rgba(227,73,237,.03)',
                }}>
                  <b style={{ color: '#fff' }}>{profiles[n.from_user_id]?.username?.split('@')[0] || '用户'}</b>
                  {' '}{typeLabel[n.type] || n.type}{' '}
                  {typeTarget[n.type]?.(n) || ''}
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.15)', marginTop: 2 }}>
                    {new Date(n.created_at).toLocaleString('zh')}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
