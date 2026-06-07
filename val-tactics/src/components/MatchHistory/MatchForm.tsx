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
  const [firstKills, setFirstKills] = useState(editEntry?.firstKills?.toString() || '')
  const [firstDeaths, setFirstDeaths] = useState(editEntry?.firstDeaths?.toString() || '')
  const [clutches, setClutches] = useState(editEntry?.clutches?.toString() || '')
  const [damage, setDamage] = useState(editEntry?.damage?.toString() || '')
  const [plants, setPlants] = useState(editEntry?.plants?.toString() || '')
  const [defuses, setDefuses] = useState(editEntry?.defuses?.toString() || '')
  const [mvp, setMvp] = useState(editEntry?.mvp || false)
  const [atkRoster, setAtkRoster] = useState<string[]>(editEntry?.atkRoster || [])
  const [defRoster, setDefRoster] = useState<string[]>(editEntry?.defRoster || [])
  const [showRoster, setShowRoster] = useState(false)
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
      firstKills: firstKills ? parseInt(firstKills) : undefined,
      firstDeaths: firstDeaths ? parseInt(firstDeaths) : undefined,
      clutches: clutches ? parseInt(clutches) : undefined,
      damage: damage ? parseInt(damage) : undefined,
      plants: plants ? parseInt(plants) : undefined,
      defuses: defuses ? parseInt(defuses) : undefined,
      mvp: mvp || undefined,
      atkRoster: atkRoster.length > 0 ? atkRoster : undefined,
      defRoster: defRoster.length > 0 ? defRoster : undefined,
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
    setFirstKills('')
    setFirstDeaths('')
    setClutches('')
    setDamage('')
    setPlants('')
    setDefuses('')
    setMvp(false)
    setAtkRoster([])
    setDefRoster([])
    setShowRoster(false)

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
        <div className={styles.field} style={{ flex: '0 0 48px', minWidth: 0 }}>
          <label className={styles.label}>击杀</label>
          <input className={styles.input} type="number" min="0" value={kills}
            onChange={e => setKills(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field} style={{ flex: '0 0 48px', minWidth: 0 }}>
          <label className={styles.label}>死亡</label>
          <input className={styles.input} type="number" min="0" value={deaths}
            onChange={e => setDeaths(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field} style={{ flex: '0 0 48px', minWidth: 0 }}>
          <label className={styles.label}>助攻</label>
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
            <option value="赋能">赋能</option>
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field} style={{ flex: '0 0 48px', minWidth: 0 }}>
          <label className={styles.label}>首杀</label>
          <input className={styles.input} type="number" min="0" value={firstKills}
            onChange={e => setFirstKills(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field} style={{ flex: '0 0 48px', minWidth: 0 }}>
          <label className={styles.label}>首死</label>
          <input className={styles.input} type="number" min="0" value={firstDeaths}
            onChange={e => setFirstDeaths(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field} style={{ flex: '0 0 48px', minWidth: 0 }}>
          <label className={styles.label}>残局</label>
          <input className={styles.input} type="number" min="0" value={clutches}
            onChange={e => setClutches(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field} style={{ flex: '0 0 64px', minWidth: 0 }}>
          <label className={styles.label}>总伤害</label>
          <input className={styles.input} type="number" min="0" value={damage}
            onChange={e => setDamage(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field} style={{ flex: '0 0 48px', minWidth: 0 }}>
          <label className={styles.label}>下包</label>
          <input className={styles.input} type="number" min="0" value={plants}
            onChange={e => setPlants(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field} style={{ flex: '0 0 48px', minWidth: 0 }}>
          <label className={styles.label}>拆包</label>
          <input className={styles.input} type="number" min="0" value={defuses}
            onChange={e => setDefuses(e.target.value)} placeholder="0" />
        </div>
        <div className={styles.field} style={{ flex: '0 0 60px', minWidth: 0 }}>
          <label className={styles.label}>MVP</label>
          <div className={styles.resultGroup}>
            <button className={`${styles.resultBtn} ${mvp ? styles.resultBtnActiveWin : ''}`}
              onClick={() => setMvp(true)}>是</button>
            <button className={`${styles.resultBtn} ${!mvp ? styles.resultBtnActiveLoss : ''}`}
              onClick={() => setMvp(false)}>否</button>
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <button type="button" className={styles.submitBtn} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)', fontSize: 11 }}
          onClick={() => setShowRoster(v => !v)}>
          👥 阵容编辑 {showRoster ? '▲' : '▼'}
        </button>
      </div>

      {showRoster && (
        <div className={styles.field}>
          <label className={styles.label}>己方阵容（点击选择，最多5人）</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {agents.map(a => (
              <button key={`atk-${a.id}`} type="button"
                onClick={() => {
                  if (atkRoster.includes(a.id)) setAtkRoster(atkRoster.filter(id => id !== a.id))
                  else if (atkRoster.length < 5) setAtkRoster([...atkRoster, a.id])
                }}
                style={{
                  padding: '3px 8px', borderRadius: 4, border: atkRoster.includes(a.id) ? '1px solid #E349ED' : '1px solid rgba(255,255,255,.08)',
                  background: atkRoster.includes(a.id) ? 'rgba(227,73,237,.12)' : 'rgba(255,255,255,.02)',
                  color: atkRoster.includes(a.id) ? '#E349ED' : 'rgba(255,255,255,.35)',
                  fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}
              >{a.name}</button>
            ))}
          </div>

          <label className={styles.label} style={{ marginTop: 8 }}>对方阵容（点击选择，最多5人）</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {agents.map(a => (
              <button key={`def-${a.id}`} type="button"
                onClick={() => {
                  if (defRoster.includes(a.id)) setDefRoster(defRoster.filter(id => id !== a.id))
                  else if (defRoster.length < 5) setDefRoster([...defRoster, a.id])
                }}
                style={{
                  padding: '3px 8px', borderRadius: 4, border: defRoster.includes(a.id) ? '1px solid #05F8F8' : '1px solid rgba(255,255,255,.08)',
                  background: defRoster.includes(a.id) ? 'rgba(5,248,248,.08)' : 'rgba(255,255,255,.02)',
                  color: defRoster.includes(a.id) ? '#05F8F8' : 'rgba(255,255,255,.35)',
                  fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}
              >{a.name}</button>
            ))}
          </div>
        </div>
      )}

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
