import { useState, useEffect } from 'react'
import { toggleProfileFavorite, isProfileFavorited } from '../../lib/community/profileFavorites'
import { useAuth } from '../../store/AuthContext'

interface Props {
  targetUserId: string
  count: number
}

export default function FavoriteProfileButton({ targetUserId, count }: Props) {
  const { user } = useAuth()
  const [favorited, setFavorited] = useState(false)
  const [favCount, setFavCount] = useState(count)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || user.id === targetUserId) return
    isProfileFavorited(user.id, targetUserId).then(setFavorited)
  }, [user, targetUserId])

  const handleClick = async () => {
    if (!user || loading) return
    setLoading(true)
    try {
      const result = await toggleProfileFavorite(user.id, targetUserId)
      setFavorited(result)
      setFavCount(c => result ? c + 1 : Math.max(0, c - 1))
    } catch {}
    setLoading(false)
  }

  if (!user || user.id === targetUserId) return null

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: '5px 10px',
        background: favorited ? 'rgba(240,192,255,.08)' : 'rgba(255,255,255,.02)',
        border: favorited ? '1px solid rgba(240,192,255,.2)' : '1px solid rgba(255,255,255,.06)',
        borderRadius: 8, color: favorited ? '#f0c0ff' : 'rgba(255,255,255,.35)',
        cursor: 'pointer', fontSize: 11, fontWeight: favorited ? 600 : 400,
        fontFamily: 'inherit',
      }}
    >
      {favorited ? '已收藏' : '收藏'}{favCount > 0 ? ` ${favCount}` : ''}
    </button>
  )
}
