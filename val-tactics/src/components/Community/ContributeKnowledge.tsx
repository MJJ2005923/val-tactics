import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import styles from './ContributeKnowledge.module.css'

const CATEGORIES = ['战术', '地图', '特工', '阵容', '武器', '经济', '技巧', '版本', '其他']

export default function ContributeKnowledge() {
  const { user } = useAuth()
  const [cat, setCat] = useState('战术')
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!user) { setError('请先登录'); return }
    if (!content.trim()) { setError('请输入知识内容'); return }
    setSending(true); setError('')
    try {
      const { error: e } = await supabase.from('knowledge_contributions').insert({
        user_id: user.id, category: cat, content: content.trim(), source: source.trim(),
      })
      if (e) throw e
      setDone(true)
      setContent(''); setSource('')
    } catch (e: any) { setError(e.message || '提交失败') }
    setSending(false)
  }

  return (
    <div className={styles.page}>
      <h2>📝 贡献知识</h2>
      <p className={styles.desc}>分享你的游戏技巧、战术心得、英雄理解。审核通过后将补充到 T教练 知识库，同时你的名字将永久出现在「特别鸣谢」页面的知识贡献者名单中，伴随网站一同成长。</p>

      {done ? (
        <div className={styles.done}>
          <div className={styles.doneIcon}>✅</div>
          <div>提交成功！管理员审核通过后会加入知识库。</div>
          <button className={styles.submitBtn} onClick={() => setDone(false)}>继续贡献</button>
        </div>
      ) : (
        <>
          <div className={styles.field}>
            <label className={styles.label}>分类</label>
            <div className={styles.cats}>
              {CATEGORIES.map(c => (
                <button key={c} className={`${styles.catBtn} ${cat === c ? styles.catActive : ''}`} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>内容</label>
            <textarea className={styles.textarea} placeholder="写下你的知识分享，例如：亚海悬城B点防守烟可以站在箱子上..." value={content} onChange={e => setContent(e.target.value)} maxLength={2000} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>参考来源（可选）</label>
            <input className={styles.input} placeholder="如：VCT大师赛决赛、某某教学视频、实战经验..." value={source} onChange={e => setSource(e.target.value)} maxLength={200} />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={sending || !user}>
            {sending ? '提交中...' : '提交审核'}
          </button>
        </>
      )}
    </div>
  )
}
