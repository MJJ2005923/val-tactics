import { useState, useEffect, useCallback } from 'react'
import { getPosts } from '../../lib/community/posts'
import { getProfiles } from '../../lib/community/profiles'
import type { Post, Profile, PostCategory } from '../../types/community'
import { POST_CATEGORIES } from '../../types/community'
import styles from './ForumPage.module.css'

interface Props {
  onBack: () => void
  onViewPost: (id: string) => void
  onCreatePost: () => void
  embedded?: boolean
}

export default function ForumPage({ onBack, onViewPost, onCreatePost, embedded }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [cat, setCat] = useState<PostCategory | ''>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getPosts({ category: cat || undefined })
      setPosts(r.data)
      const ids = [...new Set(r.data.map(p => p.user_id))]
      if (ids.length > 0) {
        const profs = await getProfiles(ids)
        const map: Record<string, Profile> = {}
        profs.forEach(p => { map[p.id] = p })
        setProfiles(map)
      }
    } catch {}
    setLoading(false)
  }, [cat])

  useEffect(() => { load() }, [load])

  return (
    <div className={embedded ? styles.pageEmbedded : styles.page}>
      <div className={styles.topBar}>
        {!embedded && <button className={styles.backBtn} onClick={onBack}>返回</button>}
        {(['', 'discussion', 'guide', 'map', 'team'] as (PostCategory | '')[]).map(c => (
          <button key={c} className={`${styles.catTab} ${cat === c ? styles.catTabActive : ''}`} onClick={() => setCat(c)}>
            {c === '' ? '全部' : POST_CATEGORIES[c]}
          </button>
        ))}
        <button className={styles.createBtn} onClick={onCreatePost}>发帖</button>
      </div>

      {loading ? (
        <div className={styles.empty}>加载中...</div>
      ) : posts.length === 0 ? (
        <div className={styles.empty}>还没有帖子，快来发第一个</div>
      ) : (
        <div className={styles.list}>
          {posts.map(p => (
            <div key={p.id} className={styles.card} onClick={() => onViewPost(p.id)}>
              <div className={styles.cardCat}>{POST_CATEGORIES[p.category] || p.category}</div>
              <div className={styles.cardTitle}>{p.title}</div>
              <div className={styles.cardPreview}>{p.content.slice(0, 120)}</div>
              <div className={styles.cardMeta}>
                <span>{profiles[p.user_id]?.username?.split('@')[0] || '用户'}</span>
                <span>{new Date(p.created_at).toLocaleDateString('zh')}</span>
                <span>{p.views} 浏览</span>
                <span>{p.like_count} 赞</span>
                <span>{p.comment_count} 评论</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
