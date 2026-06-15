import { useState, useEffect, useCallback } from 'react'
import { getPosts } from '../../lib/community/posts'
import { getProfiles } from '../../lib/community/profiles'
import type { Post, Profile, PostCategory } from '../../types/community'
import { POST_CATEGORIES } from '../../types/community'
import styles from './ForumPage.module.css'

const PAGE_SIZE = 100

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
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getPosts({ page, pageSize: PAGE_SIZE, category: cat || undefined })
      setPosts(r.data)
      setTotal(r.total)
      const ids = [...new Set(r.data.map(p => p.user_id))]
      if (ids.length > 0) {
        const profs = await getProfiles(ids)
        const map: Record<string, Profile> = {}
        profs.forEach(p => { map[p.id] = p })
        setProfiles(map)
      }
    } catch {}
    setLoading(false)
  }, [page, cat])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filtered = (search ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase())) : posts)
    .sort((a, b) => sort === 'hot' ? (b.like_count + b.comment_count) - (a.like_count + a.comment_count) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className={embedded ? styles.pageEmbedded : styles.page}>
      <div className={styles.topBar}>
        {!embedded && <button className={styles.backBtn} onClick={onBack}>返回</button>}
        <input className={styles.searchInput} placeholder="搜索帖子..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className={styles.sortBtns}>
          <button className={`${styles.sortBtn} ${sort === 'latest' ? styles.sortBtnActive : ''}`} onClick={() => setSort('latest')}>最新</button>
          <button className={`${styles.sortBtn} ${sort === 'hot' ? styles.sortBtnActive : ''}`} onClick={() => setSort('hot')}>最热</button>
        </div>
        {(['', 'discussion', 'guide', 'map', 'team', 'tournament', 'training', 'other'] as (PostCategory | '')[]).map(c => (
          <button key={c} className={`${styles.catTab} ${cat === c ? styles.catTabActive : ''}`} onClick={() => { setCat(c); setPage(1) }}>
            {c === '' ? '全部' : POST_CATEGORIES[c]}
          </button>
        ))}
        <button className={styles.createBtn} onClick={onCreatePost}>发帖</button>
      </div>

      {loading ? (
        <div className={styles.empty}>加载中...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>{search ? '没有匹配的帖子' : '还没有帖子，快来发第一个'}</div>
      ) : (
        <>
        <div className={styles.list}>
          {filtered.map(p => (
            <div key={p.id} className={styles.card} onClick={() => onViewPost(p.id)}>
              <div className={styles.cardLeft}>
                <div className={styles.cardCat}>{p.category === 'other' && p.tags?.[0] ? p.tags[0] : POST_CATEGORIES[p.category] || p.category}</div>
                <div className={styles.cardTitle}>{p.title}</div>
                <div className={styles.cardPreview}>{p.content.slice(0, 80)}</div>
                <div className={styles.cardMeta}>
                  <span>{profiles[p.user_id]?.username?.split('@')[0] || '用户'}</span>
                  <span>{new Date(p.created_at).toLocaleDateString('zh')}</span>
                </div>
              </div>
              <div className={styles.cardStats}>
                <span>{p.views} <small>浏览</small></span>
                <span>{p.like_count} <small>赞</small></span>
                <span>{p.comment_count} <small>评论</small></span>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={page === i + 1 ? styles.pageActive : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
          </div>
        )}
        </>
      )}
    </div>
  )
}
