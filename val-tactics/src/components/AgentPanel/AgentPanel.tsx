import { useState, useRef, useEffect, useMemo } from 'react'
import agents, { agentImages, type Agent, type Ability } from '../../data/agents'
import { useTactics } from '../../store/TacticsContext'
import SkillDetail from '../SkillDetail/SkillDetail'
import { setPendingDragData } from '../MapCanvas/MapCanvas'
import styles from './AgentPanel.module.css'

const abilityKeyOrder: Record<string, number> = { C: 0, Q: 1, E: 2, X: 3 }

const typeLabels: Record<string, string> = {
  smoke: '烟雾', flash: '闪光', damage: '伤害', recon: '侦查',
  control: '控制', heal: '治疗', mobility: '位移'
}

const typeColors: Record<string, string> = {
  smoke: '#7ec868', flash: '#f0c850', damage: '#ff4655',
  recon: '#50b4f0', control: '#a070d8', heal: '#50e890', mobility: '#ff8c42'
}

function getAgentImage(agent: Agent): string {
  const devName = agentImages[agent.id] || agent.id
  return `/images/agents/${devName}.png`
}

function DraggableAgentHeader({ agent }: { agent: Agent }) {
  return (
    <div
      className={styles.agentDragArea}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'agent', agentId: agent.id }))
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <img src={getAgentImage(agent)} alt={agent.name} className={styles.agentAvatar}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
    </div>
  )
}

// 不可拖拽的技能（治疗/复活等单体技能，不需要战术布置）
const nonDraggable = new Set(['sage-healing-orb', 'sage-resurrection', 'reyna-devour', 'reyna-dismiss', 'reyna-empress', 'clove-pick-me-up', 'clove-not-dead-yet', 'jett-blade-storm', 'neon-overdrive', 'iso-double-tap', 'cypher-neural-theft', 'chamber-headhunter', 'chamber-tour-de-force', 'veto-x', 'miks-q'])

function DraggableAbility({ ability, agent }: { ability: Ability; agent: Agent }) {
  const isDraggable = !nonDraggable.has(ability.id)
  const isJett = agent.id === 'jett'
  const isSage = agent.id === 'sage'
  const overrideColor = isJett ? '#ffffff' : isSage ? '#50b4f0' : undefined
  const c = overrideColor || typeColors[ability.type]
  const label = typeLabels[ability.type]
  const iconSrc = `/images/abilities/${ability.id}.png`
  return (
    <div
      className={`${styles.abilityBtn} ${!isDraggable ? styles.abilityBtnDisabled : ''}`}
      draggable={isDraggable}
      onDragStart={isDraggable ? (e) => {
        const dragData = { type: 'ability' as const, abilityId: ability.id, agentId: agent.id }
        e.dataTransfer.setData('application/json', JSON.stringify(dragData))
        e.dataTransfer.effectAllowed = 'copy'
        setPendingDragData(dragData)
      } : undefined}
    >
      <div className={styles.abilityIconWrap} style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }}>
        <img src={iconSrc} alt="" style={{ width: 20, height: 20 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>
      <div className={styles.abilityInfo}>
        <div className={styles.abilityName}>{ability.name} · {ability.nameEn}</div>
        <div className={styles.abilityType} style={{ color: c }}>{label}</div>
      </div>
      <span className={styles.abilityKeyBadge} style={{ background: c }}>{ability.key}</span>
    </div>
  )
}

function RosterSlots({ team, onAgentClick }: { team: 'attack' | 'defense'; onAgentClick: (agentId: string) => void }) {
  const { roster, dispatch } = useTactics()
  const ids = roster[team]
  const color = team === 'attack' ? '#ff4655' : '#50b4f0'
  const label = team === 'attack' ? 'Ω 欧米茄' : 'α 阿尔法'
  return (
    <div className={styles.rosterGroup}>
      <div className={styles.rosterLabel} style={{ color }}>{label}</div>
      <div className={styles.rosterSlots}>
        {[0, 1, 2, 3, 4].map(i => {
          const agentId = ids[i]
          const agent = agentId ? agents.find(a => a.id === agentId) : null
          return (
            <div key={i} className={styles.rosterSlot}
              style={agent ? { borderStyle: 'solid', borderColor: color + '60', background: color + '10' } : { borderColor: color + '20' }}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={e => {
                e.preventDefault()
                const raw = e.dataTransfer.getData('application/json')
                if (!raw) return
                try {
                  const data = JSON.parse(raw)
                  if (data.type === 'agent') dispatch({ type: 'ADD_TO_ROSTER', team, agentId: data.agentId })
                } catch {}
              }}>
              {agent
                ? <div className={styles.rosterFilled} onClick={() => onAgentClick(agent.id)}
                    onContextMenu={e => { e.preventDefault(); dispatch({ type: 'REMOVE_FROM_ROSTER', team, agentId: agent.id }) }}
                    title="左键查看 · 右键移除"
                    key={agent.id}>
                    <img src={getAgentImage(agent)} alt={agent.name} className={styles.rosterAvatar}
                      style={{ borderColor: color, boxShadow: `0 0 8px ${color}60` }} />
                    <span className={styles.rosterName}>{agent.name}<span className={styles.rosterNameEn}>{agent.nameEn}</span></span>
                  </div>
                : <span className={styles.rosterEmpty}>+</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AgentPanel({ animate }: { animate?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedAbility, setSelectedAbility] = useState<{ ability: Ability; agent: Agent } | null>(null)
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const handleRosterClick = (agentId: string) => {
    setExpandedId(agentId)
    setTimeout(() => {
      const listEl = listRef.current
      const el = listEl?.querySelector(`[data-agent-id="${agentId}"]`) as HTMLElement | null
      if (el && listEl) {
        listEl.scrollTo({ top: el.offsetTop - listEl.offsetTop - 8, behavior: 'smooth' })
      }
    }, 80)
  }

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.style.overflowY = selectedAbility ? 'hidden' : 'auto'
  }, [selectedAbility])

  const filtered = useMemo(() => search
    ? agents.filter(a => a.name.includes(search) || a.nameEn.toLowerCase().includes(search.toLowerCase()))
    : agents, [search])

  const agentList = useMemo(() => (
    <div className={styles.list} ref={listRef}>
      {filtered.length === 0 && (
        <div className={styles.emptySearch}>未找到匹配的特工</div>
      )}
      {filtered.map(agent => {
        const isExpanded = expandedId === agent.id
        const sorted = [...agent.abilities].sort((a, b) => abilityKeyOrder[a.key] - abilityKeyOrder[b.key])
        return (
          <div key={agent.id} className={`${styles.agentItem} ${isExpanded ? styles.agentItemExpanded : ''}`} data-agent-id={agent.id}>
            <div className={styles.agentRow}>
              <DraggableAgentHeader agent={agent} />
              <button
                className={`${styles.agentBtn} ${isExpanded ? styles.agentBtnActive : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : agent.id)}
              >
                <span className={styles.agentRole} style={{ color: typeColors[agent.abilities[0]?.type] || '#888' }}>{agent.role}</span>
                <span className={styles.agentName}>{agent.name}</span>
                <span className={styles.arrow} style={{ transform: isExpanded ? 'rotate(90deg)' : undefined }}>▸</span>
              </button>
            </div>
            {isExpanded && (
              <div className={styles.abilities}>
                <div className={styles.dragHint}>拖拽头像放置位置 · 拖拽技能布置战术</div>
                {sorted.map(ab => (
                  <div key={ab.id} className={styles.abilityRow} onClick={() => setSelectedAbility({ ability: ab, agent })} title="点击查看技能详情">
                    <DraggableAbility ability={ab} agent={agent} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      )}
    </div>
  ), [filtered, expandedId])

  return (
    <>
      <div className={`${styles.panel} ${animate ? styles.panelEnter : ''}`}>
        <div className={styles.sectionLabel}>阵容构建</div>
        <div className={styles.rosterRow}>
          <RosterSlots team="attack" onAgentClick={handleRosterClick} />
          <RosterSlots team="defense" onAgentClick={handleRosterClick} />
        </div>
        <div className={styles.divider} />
        <div className={styles.sectionLabel}>特工列表</div>
        <div className={styles.searchBox}>
          <input className={styles.searchInput} type="text" placeholder="搜索特工..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {agentList}
      </div>
      {selectedAbility && (
        <SkillDetail ability={selectedAbility.ability} agentName={selectedAbility.agent.name} agentRole={selectedAbility.agent.role} onClose={() => setSelectedAbility(null)} />
      )}
    </>
  )
}

export default AgentPanel
