import { useState } from 'react'
import { createTactic } from '../../lib/community/tactics'
import { useAuth } from '../../store/AuthContext'
import { useTactics } from '../../store/TacticsContext'
import maps from '../../data/maps'
import styles from './CreateShare.module.css'

interface Props {
  mapId: string
  onClose: () => void
  onSuccess: (id: string) => void
}

export default function CreateShare({ mapId, onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const { markers, drawings, textAnnotations, agentPositions, abilityShapes, roster, strategyName, strategyDescription } = useTactics()
  const [selectedMap, setSelectedMap] = useState(mapId)
  const [title, setTitle] = useState(strategyName || '')
  const [desc, setDesc] = useState(strategyDescription || '')
  const [previewImg, setPreviewImg] = useState('')
  const [lineupCount, setLineupCount] = useState('')
  const [lineupImgs, setLineupImgs] = useState<string[]>([])
  const [effectImgs, setEffectImgs] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!user) { setError('请先登录'); return }
    if (!title.trim()) { setError('请输入标题'); return }
    setSending(true)
    setError('')
    try {
      const tactic = await createTactic({
        userId: user.id,
        title: title.trim(),
        description: desc.trim(),
        mapId: selectedMap,
        tacticData: {
          v: 2,
          m: selectedMap,
          name: strategyName,
          desc: strategyDescription,
          mk: markers.map(m => ({ a: m.abilityId, g: m.agentId, x: m.x, y: m.y, s: m.step, t: m.time, n: m.note || undefined })),
          dr: drawings,
          tx: textAnnotations,
          ap: agentPositions,
          as: abilityShapes.map(s => ({ ...s, path: s.path?.map(p => ({ x: p.x, y: p.y })) })),
          lineupCount: parseInt(lineupCount) || 0,
          roster,
        },
        previewImage: previewImg || undefined,
        lineupImages: lineupImgs.filter(u => u.trim()),
        effectImages: effectImgs.filter(u => u.trim()),
      })
      if (tactic) {
        onSuccess(tactic.id)
      } else {
        setError('发布失败，请重试')
      }
    } catch (e: any) {
      setError(e.message || '发布失败')
    }
    setSending(false)
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel}>
        <div className={styles.title}>📤 发布战术到社区</div>

        <div className={styles.field}>
          <div className={styles.label}>地图</div>
          <select className={styles.input} value={selectedMap} onChange={e => setSelectedMap(e.target.value)}
            style={{ color: '#05F8F8', cursor: 'pointer' }}>
            {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>标题 *</div>
          <input
            className={styles.input}
            placeholder="给你的战术取个名字…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.label}>描述</div>
          <textarea
            className={styles.textarea}
            placeholder="简单描述一下战术思路…"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            maxLength={500}
          />
        </div>

<div className={styles.field}>
          <div className={styles.label}>点位数量</div>
          <input className={styles.input} placeholder="这个战术包含几个技能点位？" value={lineupCount}
            onChange={e => setLineupCount(e.target.value.replace(/\D/g, ''))} maxLength={3} />
        </div>

        {/* 点位图 — 动态添加 */}
        <div className={styles.field}>
          <div className={styles.label}>点位图（战术中用到的技能点位截图）</div>
          {lineupImgs.map((url, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input className={styles.input} placeholder="粘贴图片URL" value={url}
                onChange={e => { const arr = [...lineupImgs]; arr[i] = e.target.value; setLineupImgs(arr) }} />
              <button type="button" onClick={() => setLineupImgs(lineupImgs.filter((_, j) => j !== i))}
                style={{ background: 'none', border: '1px solid rgba(255,85,85,.2)', color: '#ff5555', borderRadius: 8, cursor: 'pointer', fontSize: 11, padding: '0 8px' }}>删</button>
            </div>
          ))}
          <button type="button" onClick={() => setLineupImgs([...lineupImgs, ''])}
            style={{ background: 'rgba(5,248,248,.06)', border: '1px solid rgba(5,248,248,.15)', color: '#05F8F8', borderRadius: 8, cursor: 'pointer', fontSize: 11, padding: '4px 12px' }}>+ 添加点位图</button>
        </div>

        {/* 预览效果图 — 动态添加 */}
        <div className={styles.field}>
          <div className={styles.label}>预览效果图（战术最终效果展示）</div>
          {effectImgs.map((url, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input className={styles.input} placeholder="粘贴图片URL" value={url}
                onChange={e => { const arr = [...effectImgs]; arr[i] = e.target.value; setEffectImgs(arr) }} />
              <button type="button" onClick={() => setEffectImgs(effectImgs.filter((_, j) => j !== i))}
                style={{ background: 'none', border: '1px solid rgba(255,85,85,.2)', color: '#ff5555', borderRadius: 8, cursor: 'pointer', fontSize: 11, padding: '0 8px' }}>删</button>
            </div>
          ))}
          <button type="button" onClick={() => setEffectImgs([...effectImgs, ''])}
            style={{ background: 'rgba(5,248,248,.06)', border: '1px solid rgba(5,248,248,.15)', color: '#05F8F8', borderRadius: 8, cursor: 'pointer', fontSize: 11, padding: '4px 12px' }}>+ 添加预览图</button>
        </div>

        {/* 主预览图 */}
        <div className={styles.field}>
          <div className={styles.label}>封面缩略图</div>
          <input className={styles.input} placeholder="展示在卡片上的封面图URL（可选）" value={previewImg} onChange={e => setPreviewImg(e.target.value)} />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>取消</button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={sending || !user}>
            {sending ? '发布中…' : '发布'}
          </button>
        </div>
      </div>
    </div>
  )
}
