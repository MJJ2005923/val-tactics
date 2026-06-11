import { useState, useRef } from 'react'
import { createLineup } from '../../lib/community/lineups'
import { useAuth } from '../../store/AuthContext'
import maps from '../../data/maps'
import agents from '../../data/agents'
import ImageUploader from './ImageUploader'
import styles from './LineupsCreate.module.css'

interface Props {
  mapId: string
  onClose: () => void
  onSuccess: (id: string) => void
}

// 预生成 UUID 用于 Storage 路径
let _counter = 0
function tempId() { return `tmp_${Date.now()}_${++_counter}` }

export default function LineupsCreate({ mapId, onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const lineupIdRef = useRef(tempId())
  const [selectedMap, setSelectedMap] = useState(mapId)
  const [agentId, setAgentId] = useState('')
  const [abilityId, setAbilityId] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [posImg, setPosImg] = useState('')
  const [aimImg, setAimImg] = useState('')
  const [startPt, setStartPt] = useState<{x:number;y:number}|null>(null)
  const [targetPt, setTargetPt] = useState<{x:number;y:number}|null>(null)
  const [pickingMode, setPickingMode] = useState<'start'|'target'|null>(null)
  const mapImgRef = useRef<HTMLImageElement>(null)
  const [releaseImg, setReleaseImg] = useState('')
  const [effectImg, setEffectImg] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const selectedAgent = agents.find(a => a.id === agentId)

  const handleSubmit = async () => {
    if (!user) { setError('请先登录'); return }
    if (!title.trim()) { setError('请输入标题'); return }
    if (!agentId) { setError('请选择特工'); return }
    if (!abilityId) { setError('请选择技能'); return }

    setSending(true); setError('')
    try {
      const l = await createLineup({
        userId: user.id, mapId: selectedMap, agentId, abilityId,
        title: title.trim(), description: desc.trim(),
        positionImg: posImg || undefined, aimImg: aimImg || undefined,
        releaseImg: releaseImg || undefined, effectImg: effectImg || undefined,
        startX: startPt?.x, startY: startPt?.y,
        targetX: targetPt?.x, targetY: targetPt?.y,
        difficulty,
      })
      if (l) onSuccess(l.id)
      else setError('发布失败')
    } catch (e: any) { setError(e.message || '发布失败') }
    setSending(false)
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel}>
        <div className={styles.panelTitle}>发布技能点位</div>
        <div className={styles.fields}>
          <div>
            <div className={styles.fieldLabel}>地图</div>
            <select className={styles.select} value={selectedMap} onChange={e => { setSelectedMap(e.target.value); setStartPt(null); setTargetPt(null) }}>
              {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className={styles.row2}>
            <div>
              <div className={styles.fieldLabel}>特工</div>
              <select className={styles.select} value={agentId} onChange={e => { setAgentId(e.target.value); setAbilityId('') }}>
                <option value="">选择特工</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <div className={styles.fieldLabel}>技能</div>
              <select className={styles.select} value={abilityId} onChange={e => setAbilityId(e.target.value)} disabled={!selectedAgent}>
                <option value="">选择技能</option>
                {selectedAgent?.abilities.map(ab => (
                  <option key={ab.id} value={ab.id}>{ab.name} [{ab.key}]</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className={styles.fieldLabel}>标题</div>
            <input className={styles.input} placeholder="钢铁侠B点防守烟" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
          </div>
          <div>
            <div className={styles.fieldLabel}>描述</div>
            <input className={styles.input} placeholder="站在箱子上，准星对准窗户右上角..." value={desc} onChange={e => setDesc(e.target.value)} maxLength={200} />
          </div>

          <div>
            <div className={styles.fieldLabel}>难度 (1-5)</div>
            <input type="range" min={1} max={5} value={difficulty} onChange={e => setDifficulty(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#E349ED' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,.15)' }}>
              <span>简单</span><span>中等</span><span>困难</span>
            </div>
          </div>

          <div>
            <div className={styles.fieldLabel}>地图坐标</div>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', marginBottom: 4 }}>
            <img
              ref={mapImgRef}
              src={`/images/maps/${selectedMap}.png`}
              alt=""
              style={{ width: '100%', display: 'block', cursor: pickingMode ? 'crosshair' : 'default' }}
              onClick={(e) => {
                if (!pickingMode || !mapImgRef.current) return
                const rect = mapImgRef.current.getBoundingClientRect()
                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100
                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100
                if (pickingMode === 'start') setStartPt({ x, y })
                else setTargetPt({ x, y })
                setPickingMode(null)
              }}
            />
            {/* 标记点和连线 */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
              {startPt && (
                <circle cx={`${startPt.x * 100}%`} cy={`${startPt.y * 100}%`} r="6" fill="#05F8F8" stroke="#fff" strokeWidth="2" />
              )}
              {targetPt && (
                <circle cx={`${targetPt.x * 100}%`} cy={`${targetPt.y * 100}%`} r="6" fill="#E349ED" stroke="#fff" strokeWidth="2" />
              )}
              {startPt && targetPt && (
                <>
                  <line x1={`${startPt.x * 100}%`} y1={`${startPt.y * 100}%`} x2={`${targetPt.x * 100}%`} y2={`${targetPt.y * 100}%`} stroke="#f0c0ff" strokeWidth="1.5" strokeDasharray="4,3" opacity=".7" />
                  <line x1={`${startPt.x * 100}%`} y1={`${startPt.y * 100}%`} x2={`${targetPt.x * 100}%`} y2={`${targetPt.y * 100}%`} stroke="#fff" strokeWidth=".5" opacity=".3" />
                </>
              )}
            </svg>
          </div>
          <div className={styles.row2}>
            <button type="button" className={`${styles.coordBtn} ${pickingMode === 'start' ? styles.coordActive : ''}`} onClick={() => setPickingMode('start')}>
              {startPt ? `站位 (${startPt.x.toFixed(2)}, ${startPt.y.toFixed(2)})` : '点击选择站位'}
            </button>
            <button type="button" className={`${styles.coordBtn} ${pickingMode === 'target' ? styles.coordActive : ''}`} onClick={() => setPickingMode('target')}>
              {targetPt ? `落点 (${targetPt.x.toFixed(2)}, ${targetPt.y.toFixed(2)})` : '点击选择落点'}
            </button>
          </div>
          {(startPt || targetPt) && (
            <button type="button" className={styles.coordBtn} onClick={() => { setStartPt(null); setTargetPt(null); setPickingMode(null) }}
              style={{ borderColor: 'rgba(255,85,85,.2)', color: '#ff5555', fontSize: 11, padding: '4px 10px', width: 'auto' }}>
              清除坐标
            </button>
          )}

          <div className={styles.fieldLabel}>截图</div>
            <div className={styles.images4}>
              <div><div className={styles.fieldLabel} style={{ fontSize: 10 }}>站位图</div><ImageUploader hint="如: 站在箱子上" onImage={setPosImg} value={posImg} userId={user?.id} lineupId={lineupIdRef.current} slot="position" /></div>
              <div><div className={styles.fieldLabel} style={{ fontSize: 10 }}>瞄点图</div><ImageUploader hint="如: 准星对准墙角" onImage={setAimImg} value={aimImg} userId={user?.id} lineupId={lineupIdRef.current} slot="aim" /></div>
              <div><div className={styles.fieldLabel} style={{ fontSize: 10 }}>释放方式</div><ImageUploader hint="如: 右键跳投" onImage={setReleaseImg} value={releaseImg} userId={user?.id} lineupId={lineupIdRef.current} slot="release" /></div>
              <div><div className={styles.fieldLabel} style={{ fontSize: 10 }}>最终效果</div><ImageUploader hint="如: 烟落点位置" onImage={setEffectImg} value={effectImg} userId={user?.id} lineupId={lineupIdRef.current} slot="effect" /></div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>取消</button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={sending || !user}>{sending ? '发布中...' : '发布'}</button>
        </div>
      </div>
    </div>
  )
}
