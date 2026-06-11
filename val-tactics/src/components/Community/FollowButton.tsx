import { useState, useEffect } from 'react'
import { toggleFollow, getFollowStatus } from '../../lib/community/follows'
import { useAuth } from '../../store/AuthContext'

interface Props {
  targetUserId: string
}

export default function FollowButton({ targetUserId }: Props) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || user.id === targetUserId) return
    getFollowStatus(user.id, targetUserId).then(setFollowing)
  }, [user, targetUserId])

  const handleClick = async () => {
    if (!user || loading) return
    setLoading(true)
    try {
      const result = await toggleFollow(user.id, targetUserId)
      setFollowing(result)
    } catch {}
    setLoading(false)
  }

  if (!user || user.id === targetUserId) return null

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: '5px 12px',
        background: following ? 'rgba(5,248,248,.08)' : 'rgba(5,248,248,.03)',
        border: following ? '1px solid rgba(5,248,248,.2)' : '1px solid rgba(5,248,248,.1)',
        borderRadius: 8, color: following ? '#05F8F8' : 'rgba(255,255,255,.4)',
        cursor: 'pointer', fontSize: 12, fontWeight: 600,
      }}
    >
      {loading ? '...' : following ? '已关注' : '+ 关注'}
    </button>
  )
}
