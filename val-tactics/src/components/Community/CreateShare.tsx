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
  const [title, setTitle] = useState(strategyName || '')
  const [desc, setDesc] = useState(strategyDescription || '')
  const [previewImg, setPreviewImg] = useState('')
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
        mapId,
        tacticData: {
          v: 2,
          m: mapId,
          name: strategyName,
          desc: strategyDescription,
          mk: markers.map(m => ({ a: m.abilityId, g: m.agentId, x: m.x, y: m.y, s: m.step, t: m.time, n: m.note || undefined })),
          dr: drawings,
          tx: textAnnotations,
          ap: agentPositions,
          as: abilityShapes.map(s => ({ ...s, path: s.path?.map(p => ({ x: p.x, y: p.y })) })),
          roster,
        },
        previewImage: previewImg || undefined,
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
          <div className={styles.input} style={{ color: '#05F8F8' }}>
            {maps.find(m => m.id === mapId)?.name || mapId}
          </div>
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
          <div className={styles.label}>预览图</div>
          <input
            className={styles.input}
            placeholder="粘贴战术截图的图片URL（可选）"
            value={previewImg}
            onChange={e => setPreviewImg(e.target.value)}
          />
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
