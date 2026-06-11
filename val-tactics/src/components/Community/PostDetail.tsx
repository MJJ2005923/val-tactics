import { useState, useEffect } from 'react'
import { getPost, deletePost } from '../../lib/community/posts'
import { getProfile } from '../../lib/community/profiles'
import { useAuth } from '../../store/AuthContext'
import type { Post, Profile } from '../../types/community'
import { POST_CATEGORIES } from '../../types/community'
import LikeButton from './LikeButton'
import FollowButton from './FollowButton'
import CommentSection from './CommentSection'
import styles from './PostDetail.module.css'

interface Props {
  postId: string
  onBack: () => void
}

export default function PostDetail({ postId, onBack }: Props) {
  const { user } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [author, setAuthor] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleted, setDeleted] = useState(false)

  useEffect(() => {
    (async () => {
      const p = await getPost(postId)
      if (!p) { setDeleted(true); setLoading(false); return }
      setPost(p)
      const prof = await getProfile(p.user_id)
      setAuthor(prof)
      setLoading(false)
    })()
  }, [postId])

  const handleDelete = async () => {
    if (!post || !user || user.id !== post.user_id) return
    if (!confirm('确定删除这篇帖子？')) return
    await deletePost(post.id)
    setDeleted(true)
  }

  if (loading) return <div className={styles.page}><div className={styles.topBar}><button className={styles.backBtn} onClick={onBack}>返回论坛</button></div><div className={styles.loading}>加载中...</div></div>
  if (deleted || !post) return <div className={styles.page}><div className={styles.topBar}><button className={styles.backBtn} onClick={onBack}>返回论坛</button></div><div className={styles.deleted}>帖子已删除或不存在</div></div>

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>返回论坛</button>
      </div>
      <div className={styles.content}>
        <div className={styles.cat}>{POST_CATEGORIES[post.category] || post.category}</div>
        <h1 className={styles.title}>{post.title}</h1>
        <div className={styles.body}>{post.content}</div>
        <div className={styles.actionBar}>
          <span className={styles.author}>{author?.username?.split('@')[0] || '用户'}</span>
          <FollowButton targetUserId={post.user_id} />
          <span className={styles.date}>{new Date(post.created_at).toLocaleDateString('zh')} · {post.views} 浏览</span>
          <LikeButton targetType="post" targetId={post.id} targetUserId={post.user_id} initialLiked={false} likeCount={post.like_count} />
          {user && user.id === post.user_id && (
            <button onClick={handleDelete} className={styles.delBtn}>删除</button>
          )}
        </div>
        <CommentSection targetType="post" targetId={post.id} />
      </div>
    </div>
  )
}
