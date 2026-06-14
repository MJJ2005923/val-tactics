import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import styles from './SponsorPanel.module.css'

interface Sponsor { id: string; name: string; amount?: number; msg?: string }
interface Props { onClose: () => void }

const ADMIN_ID = '93ed0b1a-ae1d-4773-83fd-22cca2263b2d'

export default function SponsorPanel({ onClose }: Props) {
  const { user } = useAuth()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [contributors, setContributors] = useState<{ username: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', msg: '' })
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.id === ADMIN_ID

  useEffect(() => {
    Promise.all([
      supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
      supabase.from('knowledge_contributions').select('user_id').eq('status', 'approved'),
    ]).then(([{ data: sData }, { data: kData }]) => {
      if (sData) setSponsors(sData)
      if (kData) {
        // 统计每个用户的贡献数
        const countMap: Record<string, number> = {}
        kData.forEach((k: any) => { countMap[k.user_id] = (countMap[k.user_id] || 0) + 1 })
        // 批量查用户名
        const ids = [...new Set(kData.map((k: any) => k.user_id))]
        if (ids.length > 0) {
          supabase.from('profiles').select('id,username').in('id', ids).then(({ data: profs }) => {
            const nameMap: Record<string, string> = {}
            ;(profs || []).forEach((p: any) => { nameMap[p.id] = p.username?.split('@')[0] || '用户' })
            setContributors(ids.map(id => ({ username: nameMap[id] || '用户', count: countMap[id] || 0 })))
          })
        }
      }
      setLoading(false)
    })
  }, [])

  const addSponsor = async () => {
    if (!form.name) return
    setSaving(true)
    const { data } = await supabase.from('sponsors').insert({
      name: form.name.trim(),
      amount: 0,
      msg: form.msg.trim() || null,
    }).select('*').single()
    if (data) {
      setSponsors(prev => [...prev, data])
      setForm({ name: '', msg: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const removeSponsor = async (id: string) => {
    if (!window.confirm('确认删除？')) return
    await supabase.from('sponsors').delete().eq('id', id)
    setSponsors(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <div className={styles.header}>
          <div className={styles.icon}>🏆</div>
          <h1 className={styles.title}>特别鸣谢</h1>
          <p className={styles.sub}>
            每一位支持者都是 T教练 能够持续运营的动力。<br />
            无论金额大小，名字都将永久留存在此页面。
          </p>
          {sponsors.length > 0 && (
            <div className={styles.totalCount}>{sponsors.length} 位支持者</div>
          )}
        </div>

        {/* 管理员面板 */}
        {isAdmin && (
          <div className={styles.adminBar}>
            <button className={styles.adminBtn} onClick={() => setShowForm(v => !v)}>
              {showForm ? '收起' : '＋ 添加赞助者'}
            </button>
            {showForm && (
              <div className={styles.adminForm}>
                <input className={styles.adminInput} placeholder="名字" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
                <input className={styles.adminInput} placeholder="留言（可选）" value={form.msg}
                  onChange={e => setForm({ ...form, msg: e.target.value })} style={{ flex: 1 }} />
                <button className={styles.adminSubmit} onClick={addSponsor} disabled={saving}>
                  {saving ? '...' : '添加'}
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className={styles.empty}>加载中...</div>
        ) : sponsors.length === 0 ? (
          <div className={styles.empty}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🥺</div>
            虚位以待，等你来填<br />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.08)' }}>第一个位置留给你</span>
          </div>
        ) : (
          <div className={styles.nameGrid}>
            <div className={styles.nameTrack}>
              {/* 创作者 */}
              <div className={`${styles.nameCard} ${styles.creatorCard}`}>
                <div className={styles.nameRow}>
                  <span className={styles.nameText}>👑 MJJ</span>
                </div>
                <span className={styles.nameMsg}>感谢你的支持</span>
              </div>
              {sponsors.map((s) => (
                <div key={s.id} className={styles.nameCard}>
                  {isAdmin && (
                    <span className={styles.delBtn} onClick={() => removeSponsor(s.id)} title="删除">×</span>
                  )}
                  <div className={styles.nameRow}>
                    <span className={styles.nameText}>{s.name}</span>
                  </div>
                  {s.msg && <span className={styles.nameMsg}>「{s.msg}」</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 知识贡献者 */}
        {contributors.length > 0 && (
          <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: 'linear-gradient(135deg, rgba(5,248,248,.04), rgba(227,73,237,.02))', border: '1px solid rgba(5,248,248,.08)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#05F8F8', marginBottom: 10 }}>🧠 知识贡献者</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {contributors.map((c, i) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(5,248,248,.04)', border: '1px solid rgba(5,248,248,.08)', fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
                  {c.username} <span style={{ color: 'rgba(5,248,248,.3)', fontSize: 9 }}>×{c.count}</span>
                </span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.15)', marginTop: 8 }}>感谢以上用户为 T教练 知识库贡献智慧</div>
          </div>
        )}

        <div className={styles.footer}>
          💡 赞助后请在爱发电留言，名字将在 24 小时内上墙。
        </div>
      </div>
    </div>
  )
}
