import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import agents, { type Agent, type Ability } from '../../data/agents'
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

function DraggableAbility({ ability, agent }: { ability: Ability; agent: Agent }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-${ability.id}`,
    data: { ability, agent }
  })

  return (
    <button
      ref={setNodeRef}
      className={`${styles.abilityBtn} ${isDragging ? styles.abilityBtnDragging : ''}`}
      style={transform ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 999 : undefined,
      } : undefined}
      {...listeners}
      {...attributes}
    >
      <span className={styles.abilityKey}>{ability.key}</span>
      <span className={styles.abilityName}>{ability.name}</span>
      <span className={styles.abilityType} style={{ color: typeColors[ability.type] }}>
        {typeLabels[ability.type]}
      </span>
    </button>
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
          <input
            className={styles.searchInput}
            type="text" placeholder="搜索特工..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.list}>
          {filtered.map(agent => {
            const isExpanded = expandedId === agent.id
            const sorted = [...agent.abilities].sort((a, b) => abilityKeyOrder[a.key] - abilityKeyOrder[b.key])
            return (
              <div key={agent.id} className={styles.agentItem}>
                <button
                  className={`${styles.agentBtn} ${isExpanded ? styles.agentBtnActive : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                >
                  <span className={styles.agentRole} style={{ color: typeColors[agent.abilities[0]?.type] || '#888' }}>
                    {agent.role}
                  </span>
                  <span className={styles.agentName}>{agent.name}</span>
                  <span className={styles.agentEn}>{agent.nameEn}</span>
                  <span className={`${styles.arrow} ${isExpanded ? styles.arrowDown : ''}`}>▸</span>
                </button>
                {isExpanded && (
                  <div className={styles.abilities}>
                    {sorted.map(ab => (
                      <div key={ab.id} style={{ display: 'flex' }}>
                        <DraggableAbility ability={ab} agent={agent} />
                        <button
                          className={styles.infoBtn}
                          onClick={() => setSelectedAbility({ ability: ab, agent })}
                          title="查看详情"
                        >?</button>
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
        <SkillDetail
          ability={selectedAbility.ability}
          agentName={selectedAbility.agent.name}
          agentRole={selectedAbility.agent.role}
          onClose={() => setSelectedAbility(null)}
        />
      )}
    </>
  )
}

export default AgentPanel
