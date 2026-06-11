import { useState } from 'react'
import { toggleLike } from '../../lib/community/likes'
import { useAuth } from '../../store/AuthContext'

interface Props {
  targetType: string
  targetId: string
  targetUserId?: string
  initialLiked: boolean
  likeCount: number
  onToggle?: (liked: boolean) => void
}

export default function LikeButton({ targetType, targetId, targetUserId, initialLiked, likeCount, onToggle }: Props) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(likeCount)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!user || loading) return
    setLoading(true)
    try {
      const result = await toggleLike(user.id, targetType, targetId, targetUserId)
      setLiked(result)
      setCount(c => result ? c + 1 : Math.max(0, c - 1))
      onToggle?.(result)
    } catch {}
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={!user || loading}
      style={{
        padding: '6px 12px',
        background: liked ? 'rgba(227,73,237,.1)' : 'rgba(255,255,255,.02)',
        border: liked ? '1px solid rgba(227,73,237,.2)' : '1px solid rgba(255,255,255,.06)',
        borderRadius: 8, color: liked ? '#E349ED' : 'rgba(255,255,255,.4)',
        cursor: user ? 'pointer' : 'default', fontSize: 12, fontWeight: liked ? 600 : 400,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}
    >
      {liked ? '已赞' : '赞'} {count > 0 ? count : ''}
    </button>
  )
}
