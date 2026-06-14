import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'

interface Props {
  targetType: string
  targetId: string
  initialCount?: number
}

const tableMap: Record<string, string> = { tactic: 'tactical_shares', post: 'posts', lineup: 'lineups' }

export default function FavoriteButton({ targetType, targetId, initialCount = 0 }: Props) {
  const { user } = useAuth()
  const [faved, setFaved] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('content_favorites').select('user_id').eq('user_id', user.id).eq('target_type', targetType).eq('target_id', targetId).maybeSingle().then(({ data }) => {
      setFaved(!!data)
    })
  }, [user, targetType, targetId])

  const toggle = async () => {
    if (!user || loading) return
    setLoading(true)
    const { data } = await supabase.rpc('toggle_content_fav', { p_user_id: user.id, p_target_type: targetType, p_target_id: targetId })
    const favednow = data === true
    if (favednow) {
      setFaved(true); setCount(c => c + 1)
      const tbl = tableMap[targetType]
      if (tbl) {
        const { data: item } = await supabase.from(tbl).select('user_id').eq('id', targetId).maybeSingle()
        const ownerId = (item as any)?.user_id
        if (ownerId && ownerId !== user.id) {
          supabase.rpc('create_notification', {
            p_user_id: ownerId, p_type: 'favorite', p_from_user_id: user.id,
            p_target_type: targetType, p_target_id: targetId,
          }).then(({ error }) => { if (error) console.error('[notif] fav:', error.message) })
        }
      }
    } else {
      setFaved(false); setCount(c => Math.max(0, c - 1))
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !user}
      title={user ? (faved ? '取消收藏' : '收藏') : '请先登录'}
      style={{
        background: 'none', border: 'none', cursor: user ? 'pointer' : 'default',
        fontSize: 18, padding: '0 4px', lineHeight: 1, opacity: faved ? 1 : 0.3,
        color: faved ? '#f0c850' : 'rgba(255,255,255,.5)', verticalAlign: 'middle',
      }}
    >
      {faved ? '★' : '☆'}
      <span style={{ fontSize: 11, marginLeft: 2, color: 'rgba(255,255,255,.3)' }}>{count || ''}</span>
    </button>
  )
}
