import maps from '../../data/maps'
import agents from '../../data/agents'
import { loadMatches, computeStats } from '../../data/matchHistory'
import styles from './MatchStats.module.css'

interface Props {
  compact?: boolean
}

function winRateClass(rate: number): string {
  if (rate >= 60) return styles.winRateGood
  if (rate < 40) return styles.winRateBad
  return styles.winRateMid
}

export default function MatchStats({ compact }: Props) {
  const matches = loadMatches()
  const stats = computeStats(matches)

  const mapName = (id: string) => maps.find(m => m.id === id)?.name || id
  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id

  const cls = `${styles.container} ${compact ? styles.compact : ''}`

  if (matches.length === 0) {
    return (
      <div className={cls}>
        <div className={styles.empty}>暂无数据，先录入比赛</div>
      </div>
    )
  }

  const mapEntries = Object.entries(stats.perMapStats).sort((a, b) => b[1].matches - a[1].matches)
  const agentEntries = Object.entries(stats.perAgentStats).sort((a, b) => b[1].matches - a[1].matches)

  return (
    <div className={cls}>
      {/* 总览卡片 */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={`${styles.cardValue} ${styles.winRate}`}>{stats.winRate}%</div>
          <div className={styles.cardLabel}>胜率 · {stats.totalMatches}场</div>
        </div>
        <div className={styles.card}>
          <div className={`${styles.cardValue} ${styles.kd}`}>{stats.kdRatio}</div>
          <div className={styles.cardLabel}>K/D 比</div>
        </div>
        {stats.avgACS > 0 && (
          <div className={styles.card}>
            <div className={`${styles.cardValue} ${styles.acs}`}>{stats.avgACS}</div>
            <div className={styles.cardLabel}>场均 ACS</div>
          </div>
        )}
        {stats.avgHS > 0 && (
          <div className={styles.card}>
            <div className={`${styles.cardValue} ${styles.hs}`}>{stats.avgHS}%</div>
            <div className={styles.cardLabel}>场均爆头率</div>
          </div>
        )}
      </div>

      {/* 最近趋势 */}
      {stats.recentTrend.results.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>最近 {stats.recentTrend.results.length} 场趋势</div>
          <div className={styles.trendBar}>
            {stats.recentTrend.results.map((r, i) => (
              <div
                key={i}
                className={`${styles.trendDot} ${r === 'win' ? styles.trendWin : r === 'loss' ? styles.trendLoss : styles.trendDraw}`}
                title={`第${i + 1}场: ${r === 'win' ? '胜' : r === 'loss' ? '负' : '平'} K/D ${stats.recentTrend.kdRatios[i]}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 按地图 */}
      {mapEntries.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>各地图表现</div>
          <table className={styles.table}>
            <thead>
              <tr><th>地图</th><th>场次</th><th>胜</th><th>胜率</th></tr>
            </thead>
            <tbody>
              {mapEntries.map(([id, s]) => (
                <tr key={id}>
                  <td>{mapName(id)}</td>
                  <td>{s.matches}</td>
                  <td>{s.wins}</td>
                  <td className={`${styles.winRateCell} ${winRateClass(s.winRate)}`}>{s.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 按特工 */}
      {agentEntries.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>各特工表现</div>
          <table className={styles.table}>
            <thead>
              <tr><th>特工</th><th>场</th><th>胜率</th><th>KDA</th><th>ACS</th></tr>
            </thead>
            <tbody>
              {agentEntries.map(([id, s]) => (
                <tr key={id}>
                  <td>{agentName(id)}</td>
                  <td>{s.matches}</td>
                  <td className={`${styles.winRateCell} ${winRateClass(s.winRate)}`}>{s.winRate}%</td>
                  <td>{s.avgKills}/{s.avgDeaths}/{s.avgAssists}</td>
                  <td>{s.avgACS || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
