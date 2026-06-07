import { useState, useCallback } from 'react'
import maps from '../../data/maps'
import agents from '../../data/agents'
import { loadMatches, deleteMatch, computeStats } from '../../data/matchHistory'
import MatchForm from '../MatchHistory/MatchForm'
import MatchImport from '../MatchHistory/MatchImport'
import type { MatchEntry } from '../../types'
import styles from './MatchAnalysisPage.module.css'

interface Props {
  onBack: () => void
}

export default function MatchAnalysisPage({ onBack }: Props) {
  const [sideTab, setSideTab] = useState<'form' | 'import'>('form')
  // 数据变更后递增，触发右侧刷新
  const [tick, setTick] = useState(0)
  const [editEntry, setEditEntry] = useState<MatchEntry | null>(null)

  const matches = loadMatches()
  const stats = computeStats(matches)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const handleSaved = useCallback(() => {
    setTick(t => t + 1)
    setSideTab('form')
  }, [])

  const handleDelete = (id: string) => {
    if (!window.confirm('确认删除这场比赛记录？')) return
    deleteMatch(id)
    refresh()
  }

  const mapName = (id: string) => maps.find(m => m.id === id)?.name || id
  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id

  const mapEntries = Object.entries(stats.perMapStats).sort((a, b) => b[1].matches - a[1].matches)
  const agentEntries = Object.entries(stats.perAgentStats).sort((a, b) => b[1].matches - a[1].matches)

  const wrClass = (rate: number) => rate >= 60 ? styles.wrGood : rate < 40 ? styles.wrBad : styles.wrMid

  return (
    <div className={styles.page}>
      {/* ====== 左侧边栏 ====== */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={onBack}>← 返回战术板</button>
          <h2 className={styles.sidebarTitle}>比赛数据</h2>
        </div>

        {/* Tab切换 */}
        <div className={styles.sidebarSection}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${sideTab === 'form' ? styles.tabActive : ''}`} onClick={() => setSideTab('form')}>录入</button>
            <button className={`${styles.tab} ${sideTab === 'import' ? styles.tabActive : ''}`} onClick={() => setSideTab('import')}>批量</button>
          </div>
        </div>

        {/* 表单区 */}
        <div className={styles.formArea}>
          <div style={{ display: sideTab === 'form' ? 'block' : 'none' }}>
            <MatchForm onSaved={handleSaved} />
          </div>
          <div style={{ display: sideTab === 'import' ? 'block' : 'none' }}>
            <MatchImport onImported={handleSaved} />
          </div>
        </div>

        {/* 最近记录速览 */}
        <div className={styles.matchListArea}>
          <div className={styles.listHeader}>
            <span>最近记录</span>
            <span className={styles.count}>{matches.length} 场</span>
          </div>
          {matches.slice(0, 15).map(m => (
            <div key={m.id} className={styles.matchRow} style={{ padding: '4px 8px', gap: 6 }}>
              <div className={`${styles.resultDot} ${m.result === 'win' ? styles.rWin : m.result === 'loss' ? styles.rLoss : styles.rDraw}`} />
              <span className={styles.matchDate} style={{ width: 'auto' }}>{new Date(m.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
              <span className={styles.matchMap} style={{ width: 50, fontSize: 11 }}>{mapName(m.mapId)}</span>
              <span className={styles.matchAgent} style={{ width: 40, fontSize: 11 }}>{agentName(m.agentId)}</span>
              <span className={`${styles.matchResult} ${m.result === 'win' ? styles.mWin : m.result === 'loss' ? styles.mLoss : styles.mDraw}`} style={{ flex: 1, textAlign: 'right' }}>
                {m.result === 'win' ? '胜' : m.result === 'loss' ? '负' : '平'}
              </span>
            </div>
          ))}
          {matches.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,.2)', fontSize: 11 }}>暂无记录</div>
          )}
        </div>
      </aside>

      {/* ====== 右侧主区域 ====== */}
      <main className={styles.main} key={`main-${tick}`}>
        <h1 className={styles.pageTitle}>数据分析</h1>

        {matches.length === 0 ? (
          <div className={styles.empty}>
            还没有比赛记录<br />
            在左侧录入或导入比赛数据
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className={styles.statCards}>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.winRate}`}>{stats.winRate}%</div>
                <div className={styles.statLabel}>胜率 · {stats.totalMatches}场</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.kd}`}>{stats.kdRatio}</div>
                <div className={styles.statLabel}>K/D 比</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.acs}`}>{stats.avgACS || '-'}</div>
                <div className={styles.statLabel}>场均 ACS</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.hs}`}>{stats.avgHS > 0 ? `${stats.avgHS}%` : '-'}</div>
                <div className={styles.statLabel}>场均爆头率</div>
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
            <div className={styles.grid2}>
              {mapEntries.length > 0 && (
                <div className={styles.sectionBox}>
                  <h3>各地图表现</h3>
                  <table className={styles.table}>
                    <thead><tr><th>地图</th><th>场</th><th>胜</th><th>胜率</th></tr></thead>
                    <tbody>
                      {mapEntries.map(([id, s]) => (
                        <tr key={id}>
                          <td>{mapName(id)}</td><td>{s.matches}</td><td>{s.wins}</td>
                          <td className={`${styles.winRateCell} ${wrClass(s.winRate)}`}>{s.winRate}%</td>
                        </tr>
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
                        <tr key={id}>
                          <td>{agentName(id)}</td><td>{s.matches}</td>
                          <td className={`${styles.winRateCell} ${wrClass(s.winRate)}`}>{s.winRate}%</td>
                          <td>{s.avgKills}/{s.avgDeaths}/{s.avgAssists}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 完整比赛列表 */}
            <div className={styles.fullList}>
              <h3>全部比赛记录 · {matches.length} 场</h3>
              <div className={styles.listScroll}>
                {matches.map(m => (
                  <div key={m.id} className={styles.matchRow}>
                    <div className={`${styles.resultDot} ${m.result === 'win' ? styles.rWin : m.result === 'loss' ? styles.rLoss : styles.rDraw}`} />
                    <span className={styles.matchDate}>{new Date(m.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                    <span className={styles.matchMap}>{mapName(m.mapId)}</span>
                    <span className={styles.matchAgent}>{agentName(m.agentId)}</span>
                    <span className={`${styles.matchSide} ${m.side === 'attack' ? styles.sAtk : styles.sDef}`}>{m.side === 'attack' ? '进攻' : '防守'}</span>
                    <span className={styles.matchKda}>{m.kills}/{m.deaths}/{m.assists}{m.acs ? ` · ACS ${m.acs}` : ''}</span>
                    <span className={`${styles.matchResult} ${m.result === 'win' ? styles.mWin : m.result === 'loss' ? styles.mLoss : styles.mDraw}`}>
                      {m.result === 'win' ? '胜' : m.result === 'loss' ? '负' : '平'}
                    </span>
                    <div className={styles.matchActions}>
                      <button className={styles.matchActionBtn} onClick={() => setEditEntry(m)} title="编辑">✏️</button>
                      <button className={styles.matchActionBtn} onClick={() => handleDelete(m.id)} title="删除">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* 编辑弹窗 */}
      {editEntry && (
        <div className={styles.editOverlay} onClick={() => setEditEntry(null)}>
          <div className={styles.editModal} onClick={e => e.stopPropagation()}>
            <MatchForm
              editEntry={editEntry}
              onEditSaved={() => { setEditEntry(null); refresh() }}
            />
            <button
              style={{
                width: '100%', marginTop: 8, padding: 8,
                background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 6, color: 'rgba(255,255,255,.5)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
              onClick={() => setEditEntry(null)}
            >取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
