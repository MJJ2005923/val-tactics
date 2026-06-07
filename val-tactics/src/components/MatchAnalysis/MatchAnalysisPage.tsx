import { useState, useCallback } from 'react'
import maps from '../../data/maps'
import agents from '../../data/agents'
import { loadMatches, deleteMatch, computeStats } from '../../data/matchHistory'
import MatchForm from '../MatchHistory/MatchForm'
import MatchImport from '../MatchHistory/MatchImport'
import type { MatchEntry } from '../../types'
import styles from './MatchAnalysisPage.module.css'

interface Props { onBack: () => void }

export default function MatchAnalysisPage({ onBack }: Props) {
  const [sideTab, setSideTab] = useState<'form' | 'import'>('form')
  const [tick, setTick] = useState(0)
  const [editEntry, setEditEntry] = useState<MatchEntry | null>(null)

  const matches = loadMatches()
  const stats = computeStats(matches)
  const refresh = useCallback(() => setTick(t => t + 1), [])
  const handleSaved = useCallback(() => { setTick(t => t + 1); setSideTab('form') }, [])
  const handleDelete = (id: string) => { if (window.confirm('确认删除？')) { deleteMatch(id); refresh() } }

  const mapName = (id: string) => maps.find(m => m.id === id)?.name || id
  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id
  const mapEntries = Object.entries(stats.perMapStats).sort((a, b) => b[1].matches - a[1].matches)
  const agentEntries = Object.entries(stats.perAgentStats).sort((a, b) => b[1].matches - a[1].matches)
  const wrClass = (r: number) => r >= 60 ? styles.wrGood : r < 40 ? styles.wrBad : styles.wrMid

  return (
    <div className={styles.page}>
      {/* ====== 左侧边栏 ====== */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={onBack}>← 返回战术板</button>
          <h2 className={styles.sidebarTitle}>比赛数据</h2>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${sideTab === 'form' ? styles.tabActive : ''}`} onClick={() => setSideTab('form')}>📝 录入</button>
          <button className={`${styles.tab} ${sideTab === 'import' ? styles.tabActive : ''}`} onClick={() => setSideTab('import')}>📋 批量</button>
        </div>

        <div className={styles.formArea}>
          {sideTab === 'form' ? <MatchForm onSaved={handleSaved} /> : <MatchImport onImported={handleSaved} />}
        </div>

        {matches.length > 0 && (
          <div className={styles.sidebarList}>
            <div className={styles.listTitle}>最近 · {matches.length}场</div>
            {matches.slice(0, 10).map(m => (
              <div key={m.id} className={styles.miniRow} style={{ borderLeftColor: m.result === 'win' ? '#05F8F8' : m.result === 'loss' ? '#E349ED' : 'rgba(255,255,255,.2)' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', width: 34, flexShrink: 0 }}>{new Date(m.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                <span style={{ fontSize: 11, color: '#fff', width: 54, flexShrink: 0 }}>{mapName(m.mapId)}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', width: 38, flexShrink: 0 }}>{agentName(m.agentId)}</span>
                <span style={{ fontSize: 10, fontFamily: 'Consolas,monospace', color: 'rgba(255,255,255,.45)', flex: 1, textAlign: 'right' }}>
                  {m.kills}/{m.deaths}/{m.assists}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, width: 20, textAlign: 'center', flexShrink: 0, color: m.result === 'win' ? '#05F8F8' : m.result === 'loss' ? '#E349ED' : 'rgba(255,255,255,.4)' }}>
                  {m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D'}
                </span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ====== 右侧主区域 ====== */}
      <main className={styles.main} key={`main-${tick}`}>
        {matches.length === 0 ? (
          <div className={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
            还没有比赛记录<br />
            <span style={{ color: 'rgba(255,255,255,.3)' }}>在左侧录入或导入比赛数据</span>
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className={styles.statCards}>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.winRate}`}>{stats.winRate}%</div>
                <div className={styles.statLabel}>胜率</div>
                <div className={styles.statSub}>{stats.totalMatches} 场 · {stats.wins}胜 {stats.losses}负</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.kd}`}>{stats.kdRatio}</div>
                <div className={styles.statLabel}>K/D 比</div>
                <div className={styles.statSub}>总击杀 {matches.reduce((s,m) => s + m.kills, 0)}</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.acs}`}>{stats.avgACS || '—'}</div>
                <div className={styles.statLabel}>场均 ACS</div>
                <div className={styles.statSub}>{stats.totalMatches} 场平均</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.hs}`}>{stats.avgHS > 0 ? `${stats.avgHS}%` : '—'}</div>
                <div className={styles.statLabel}>爆头率</div>
                <div className={styles.statSub}>场均</div>
              </div>
            </div>

            {/* 趋势条 */}
            {stats.recentTrend.results.length > 0 && (
              <div className={styles.trendSection}>
                <div className={styles.trendTitle}>最近 {stats.recentTrend.results.length} 场趋势</div>
                <div className={styles.trendBar}>
                  {stats.recentTrend.results.map((r, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div className={`${styles.trendDot} ${r === 'win' ? styles.trendWin : r === 'loss' ? styles.trendLoss : styles.trendDraw}`}
                        title={`${r === 'win' ? '胜' : r === 'loss' ? '负' : '平'} K/D ${stats.recentTrend.kdRatios[i]}`} />
                      <span className={styles.trendKd}>{stats.recentTrend.kdRatios[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 表格区 */}
            {(mapEntries.length > 0 || agentEntries.length > 0) && (
              <div className={styles.grid2}>
                {mapEntries.length > 0 && (
                  <div className={styles.sectionBox}>
                    <h3>各地图表现</h3>
                    <table className={styles.table}>
                      <thead><tr><th>地图</th><th>场</th><th>胜</th><th>胜率</th></tr></thead>
                      <tbody>
                        {mapEntries.map(([id, s]) => (
                          <tr key={id}><td>{mapName(id)}</td><td>{s.matches}</td><td>{s.wins}</td>
                            <td className={`${styles.winRateCell} ${wrClass(s.winRate)}`}>{s.winRate}%</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {agentEntries.length > 0 && (
                  <div className={styles.sectionBox}>
                    <h3>各特工表现</h3>
                    <table className={styles.table}>
                      <thead><tr><th>特工</th><th>场</th><th>胜率</th><th>KDA</th></tr></thead>
                      <tbody>
                        {agentEntries.map(([id, s]) => (
                          <tr key={id}><td>{agentName(id)}</td><td>{s.matches}</td>
                            <td className={`${styles.winRateCell} ${wrClass(s.winRate)}`}>{s.winRate}%</td>
                            <td>{s.avgKills}/{s.avgDeaths}/{s.avgAssists}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 完整比赛列表 */}
            <div className={styles.fullList}>
              <h3>全部记录 · {matches.length} 场</h3>
              <div className={styles.listScroll}>
                {matches.map(m => (
                  <div key={m.id} className={styles.matchRow}>
                    <div className={`${styles.resultDot} ${m.result === 'win' ? styles.rWin : m.result === 'loss' ? styles.rLoss : styles.rDraw}`} />
                    <span className={styles.matchDate}>{new Date(m.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                    <span className={styles.matchMap}>{mapName(m.mapId)}</span>
                    <span className={styles.matchAgent}>{agentName(m.agentId)}</span>
                    <span className={`${styles.matchSide} ${m.side === 'attack' ? styles.sAtk : styles.sDef}`}>{m.side === 'attack' ? '攻' : '守'}</span>
                    <span className={styles.matchKda}>
                      {m.kills}/{m.deaths}/{m.assists}
                      {m.acs ? ` ACS${m.acs}` : ''}
                      {m.damage ? ` · ${m.damage}伤` : ''}
                      {m.firstKills ? ` FK${m.firstKills}` : ''}
                      {m.mvp ? ' MVP' : ''}
                    </span>
                    <span className={`${styles.matchResult} ${m.result === 'win' ? styles.mWin : m.result === 'loss' ? styles.mLoss : styles.mDraw}`}>
                      {m.result === 'win' ? '胜' : m.result === 'loss' ? '负' : '平'}
                    </span>
                    <button className={styles.matchActionBtn} onClick={() => setEditEntry(m)}>✏️</button>
                    <button className={styles.matchActionBtn} onClick={() => handleDelete(m.id)}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {editEntry && (
        <div className={styles.editOverlay} onClick={() => setEditEntry(null)}>
          <div className={styles.editModal} onClick={e => e.stopPropagation()}>
            <MatchForm editEntry={editEntry} onEditSaved={() => { setEditEntry(null); refresh() }} />
            <button onClick={() => setEditEntry(null)} className={styles.cancelBtn}>取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
