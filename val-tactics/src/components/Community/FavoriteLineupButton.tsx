import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'

interface Props {
  lineupId: string
  initialCount?: number
}

export default function FavoriteLineupButton({ lineupId, initialCount = 0 }: Props) {
  const { user } = useAuth()
  const [faved, setFaved] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('lineup_favorites').select('user_id').eq('user_id', user.id).eq('lineup_id', lineupId).maybeSingle().then(({ data }) => {
      setFaved(!!data)
    })
  }, [user, lineupId])

  const toggle = async () => {
    if (!user || loading) return
    setLoading(true)
    const { data } = await supabase.rpc('toggle_lineup_fav', { p_user_id: user.id, p_lineup_id: lineupId })
    const favednow = data === true
    if (favednow) {
      setFaved(true); setCount(c => c + 1)
      // 收藏时通知点位作者
      const { data: lp } = await supabase.from('lineups').select('user_id').eq('id', lineupId).maybeSingle()
      const ownerId = (lp as any)?.user_id
      if (ownerId && ownerId !== user.id) {
        void supabase.rpc('create_notification', {
          p_user_id: ownerId, p_type: 'favorite', p_from_user_id: user.id,
          p_target_type: 'lineup', p_target_id: lineupId,
        })
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
