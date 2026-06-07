import { useState } from 'react'
import maps from '../../data/maps'
import agents from '../../data/agents'
import { addMatch, createMatchId } from '../../data/matchHistory'
import type { MatchResult, PlaySide, MatchEntry } from '../../types'
import styles from './MatchForm.module.css'

interface Props {
  onSaved?: () => void
  compact?: boolean
  editEntry?: MatchEntry     // 编辑模式：预填数据
  onEditSaved?: () => void
}

export default function MatchForm({ onSaved, compact, editEntry, onEditSaved }: Props) {
  const [mapId, setMapId] = useState(editEntry?.mapId || '')
  const [agentId, setAgentId] = useState(editEntry?.agentId || '')
  const [result, setResult] = useState<MatchResult>(editEntry?.result || 'win')
  const [kills, setKills] = useState(editEntry?.kills?.toString() || '')
  const [deaths, setDeaths] = useState(editEntry?.deaths?.toString() || '')
  const [assists, setAssists] = useState(editEntry?.assists?.toString() || '')
  const [acs, setAcs] = useState(editEntry?.acs?.toString() || '')
  const [hsPercent, setHsPercent] = useState(editEntry?.hsPercent?.toString() || '')
  const [rank, setRank] = useState(editEntry?.rank || '')
  const [side, setSide] = useState<PlaySide>(editEntry?.side || 'attack')
  const [notes, setNotes] = useState(editEntry?.notes || '')
  const [error, setError] = useState('')

  const selectedAgent = agents.find(a => a.id === agentId)
  const role = selectedAgent?.role || ''

  const handleSubmit = () => {
    const missing: string[] = []
    if (!mapId) missing.push('地图')
    if (!agentId) missing.push('特工')
    if (kills === '' || kills.trim() === '') missing.push('击杀')
    if (deaths === '' || deaths.trim() === '') missing.push('死亡')
    if (assists === '' || assists.trim() === '') missing.push('助攻')

    if (missing.length > 0) {
      setError(`请填写：${missing.join('、')}`)
      return
    }
    setError('')

    const entry: MatchEntry = {
      id: editEntry?.id || createMatchId(),
      mapId,
      agentId,
      role,
      result,
      kills: parseInt(kills),
      deaths: parseInt(deaths),
      assists: parseInt(assists),
      acs: acs ? parseInt(acs) : undefined,
      hsPercent: hsPercent ? parseFloat(hsPercent) : undefined,
      rank: rank || undefined,
      side,
      notes: notes || undefined,
      timestamp: editEntry?.timestamp || Date.now(),
    }

    addMatch(entry)

    // 如果编辑模式
    if (editEntry && onEditSaved) {
      onEditSaved()
      return
    }

    // 重置表单
    setMapId('')
    setAgentId('')
    setResult('win')
    setKills('')
    setDeaths('')
    setAssists('')
    setAcs('')
    setHsPercent('')
    setRank('')
    setSide('attack')
    setNotes('')

    onSaved?.()
  }

  const resultBtns: { val: MatchResult; label: string; cls: string }[] = [
    { val: 'win', label: '胜', cls: styles.resultBtnActiveWin },
    { val: 'loss', label: '负', cls: styles.resultBtnActiveLoss },
    { val: 'draw', label: '平', cls: styles.resultBtnActiveDraw },
  ]

  const cls = `${styles.form} ${compact ? styles.compact : ''}`

  return (
    <div className={cls}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>地图</label>
          <select className={styles.select} value={mapId} onChange={e => setMapId(e.target.value)}>
            <option value="">选择地图</option>
            {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>特工</label>
          <select className={styles.select} value={agentId} onChange={e => setAgentId(e.target.value)}>
            <option value="">选择特工</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {agentId && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>角色（自动）</label>
            <div className={`${styles.select} ${styles.readonly}`}>{role}</div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>开局方</label>
            <div className={styles.resultGroup}>
              <button
                className={`${styles.resultBtn} ${side === 'attack' ? styles.resultBtnActiveWin : ''}`}
                onClick={() => setSide('attack')}
              >进攻</button>
              <button
                className={`${styles.resultBtn} ${side === 'defense' ? styles.resultBtnActiveLoss : ''}`}
                onClick={() => setSide('defense')}
              >防守</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label}>结果</label>
        <div className={styles.resultGroup}>
          {resultBtns.map(b => (
            <button
              key={b.val}
              className={`${styles.resultBtn} ${result === b.val ? b.cls : ''}`}
              onClick={() => setResult(b.val)}
            >{b.label}</button>
          ))}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>击杀 K</label>
          <input className={styles.input} type="number" min="0" value={kills}
            onChange={e => setKills(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>死亡 D</label>
          <input className={styles.input} type="number" min="0" value={deaths}
            onChange={e => setDeaths(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>助攻 A</label>
          <input className={styles.input} type="number" min="0" value={assists}
            onChange={e => setAssists(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>ACS（可选）</label>
          <input className={styles.input} type="number" min="0" value={acs}
            onChange={e => setAcs(e.target.value)} placeholder="200" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>爆头率%（可选）</label>
          <input className={styles.input} type="number" min="0" max="100" value={hsPercent}
            onChange={e => setHsPercent(e.target.value)} placeholder="25" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>段位（可选）</label>
          <select className={styles.select} value={rank} onChange={e => setRank(e.target.value)}>
            <option value="">选择</option>
            <option value="黑铁">黑铁</option>
            <option value="青铜">青铜</option>
            <option value="白银">白银</option>
            <option value="黄金">黄金</option>
            <option value="铂金">铂金</option>
            <option value="钻石1">钻石1</option>
            <option value="钻石2">钻石2</option>
            <option value="钻石3">钻石3</option>
            <option value="超凡1">超凡1</option>
            <option value="超凡2">超凡2</option>
            <option value="超凡3">超凡3</option>
            <option value="神话1">神话1</option>
            <option value="神话2">神话2</option>
            <option value="神话3">神话3</option>
            <option value="无畏神话">无畏神话</option>
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>备注（可选）</label>
        <textarea className={styles.notesInput} value={notes}
          onChange={e => setNotes(e.target.value)} placeholder="例如：对面双烟阵容，我们缺信息..."
          rows={2} />
      </div>

      <button className={styles.submitBtn} onClick={handleSubmit}>
        {editEntry ? '保存修改' : '添加比赛记录'}
      </button>

      {error && (
        <div style={{
          color: '#E349ED', fontSize: 11, marginTop: 6,
          padding: '6px 10px', background: 'rgba(227,73,237,.08)',
          borderRadius: 4, border: '1px solid rgba(227,73,237,.15)',
        }}>{error}</div>
      )}
    </div>
  )
}
