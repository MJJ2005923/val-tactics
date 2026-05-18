import { useState } from 'react'
import agents, { agentImages, type Agent, type Ability } from '../../data/agents'
import SkillDetail from '../SkillDetail/SkillDetail'
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

function DraggableAbility({ ability, agent }: { ability: Ability; agent: Agent }) {
  return (
    <div
      className={styles.abilityBtn}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'ability', abilityId: ability.id, agentId: agent.id }))
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <span className={styles.abilityIcon}>{ability.icon}</span>
      <span className={styles.abilityKey}>{ability.key}</span>
      <span className={styles.abilityName}>{ability.name}</span>
      <span className={styles.abilityType} style={{ color: typeColors[ability.type] }}>{typeLabels[ability.type]}</span>
    </div>
  )
}

function AgentPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedAbility, setSelectedAbility] = useState<{ ability: Ability; agent: Agent } | null>(null)
  const [search, setSearch] = useState('')

  const filtered = search
    ? agents.filter(a => a.name.includes(search) || a.nameEn.toLowerCase().includes(search.toLowerCase()))
    : agents

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.header}>特工列表</div>
        <div className={styles.searchBox}>
          <input className={styles.searchInput} type="text" placeholder="搜索特工..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.list}>
          {filtered.map(agent => {
            const isExpanded = expandedId === agent.id
            const sorted = [...agent.abilities].sort((a, b) => abilityKeyOrder[a.key] - abilityKeyOrder[b.key])
            return (
              <div key={agent.id} className={styles.agentItem}>
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
                    <div className={styles.dragHint}>拖拽头像放位置 · 拖拽技能放技能</div>
                    {sorted.map(ab => (
                      <div key={ab.id} className={styles.abilityRow}>
                        <DraggableAbility ability={ab} agent={agent} />
                        <button className={styles.infoBtn} onClick={() => setSelectedAbility({ ability: ab, agent })} title="详情">?</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {selectedAbility && (
        <SkillDetail ability={selectedAbility.ability} agentName={selectedAbility.agent.name} agentRole={selectedAbility.agent.role} onClose={() => setSelectedAbility(null)} />
      )}
    </>
  )
}

export default AgentPanel
