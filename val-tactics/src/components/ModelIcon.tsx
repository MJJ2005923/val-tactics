/** 模型专属 SVG 图标 — 方案F：魔方透视 */
export function ModelIcon({ modelId, size = 34 }: { modelId: string; size?: number }) {
  const s = size
  // 快速 — 单面方块
  if (modelId === 'deepseek-v4-flash') {
    return (
      <svg width={s} height={s} viewBox="0 0 34 34" fill="none">
        <rect x="5" y="5" width="24" height="24" rx="4" fill="#05F8F8" fillOpacity=".08" stroke="#05F8F8" strokeWidth="1.3" opacity=".5"/>
        <line x1="8" y1="11" x2="26" y2="11" stroke="#fff" strokeWidth=".4" opacity=".15"/>
        <line x1="8" y1="17" x2="26" y2="17" stroke="#fff" strokeWidth=".4" opacity=".15"/>
        <line x1="8" y1="23" x2="26" y2="23" stroke="#fff" strokeWidth=".4" opacity=".1"/>
        <circle cx="17" cy="15" r="1.5" fill="#05F8F8" opacity=".4"><animate attributeName="opacity" values=".2;.6;.2" dur="1.5s" repeatCount="indefinite"/></circle>
      </svg>
    )
  }
  // 均衡 — 双面方块
  if (modelId === 'deepseek-chat') {
    return (
      <svg width={s} height={s} viewBox="0 0 34 34" fill="none">
        <rect x="3" y="3" width="20" height="20" rx="3" fill="#05F8F8" fillOpacity=".04" stroke="#05F8F8" strokeWidth="1" opacity=".35"/>
        <rect x="11" y="11" width="20" height="20" rx="3" fill="#05F8F8" fillOpacity=".1" stroke="#05F8F8" strokeWidth="1.2" opacity=".55"/>
        <line x1="3" y1="3" x2="11" y2="11" stroke="#fff" strokeWidth=".25" opacity=".08"/>
        <line x1="23" y1="3" x2="31" y2="11" stroke="#fff" strokeWidth=".25" opacity=".08"/>
        <circle cx="21" cy="21" r="1.5" fill="#05F8F8" opacity=".5"><animate attributeName="opacity" values=".25;.7;.25" dur="1.5s" repeatCount="indefinite"/></circle>
      </svg>
    )
  }
  // 推理 — 三面方块
  if (modelId === 'deepseek-reasoner') {
    return (
      <svg width={s} height={s} viewBox="0 0 34 34" fill="none">
        <rect x="1" y="1" width="17" height="17" rx="3" fill="#E349ED" fillOpacity=".04" stroke="#E349ED" strokeWidth=".9" opacity=".3"/>
        <rect x="8" y="8" width="17" height="17" rx="3" fill="#E349ED" fillOpacity=".06" stroke="#E349ED" strokeWidth="1" opacity=".4"/>
        <rect x="15" y="15" width="17" height="17" rx="3" fill="#E349ED" fillOpacity=".09" stroke="#E349ED" strokeWidth="1.2" opacity=".5"/>
        <line x1="1" y1="1" x2="8" y2="8" stroke="#fff" strokeWidth=".2" opacity=".06"/>
        <line x1="8" y1="8" x2="15" y2="15" stroke="#fff" strokeWidth=".2" opacity=".08"/>
        <circle cx="23" cy="23" r="1.5" fill="#E349ED" opacity=".55"><animate attributeName="opacity" values=".2;.7;.2" dur="1.2s" repeatCount="indefinite"/></circle>
      </svg>
    )
  }
  // 深度 — 3D等距立方体
  return (
    <svg width={s} height={s} viewBox="0 0 34 34" fill="none">
      <defs>
        <linearGradient id="mdeep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E349ED"/>
          <stop offset="100%" stopColor="#05F8F8"/>
        </linearGradient>
      </defs>
      <g transform="translate(17,17)">
        <polygon points="0,-12 11,-6 0,0 -11,-6" fill="url(#mdeep)" fillOpacity=".06" stroke="url(#mdeep)" strokeWidth=".9" opacity=".3"/>
        <polygon points="0,0 11,-6 11,6 0,12" fill="url(#mdeep)" fillOpacity=".04" stroke="url(#mdeep)" strokeWidth=".7" opacity=".2"/>
        <polygon points="0,0 -11,-6 -11,6 0,12" fill="url(#mdeep)" fillOpacity=".09" stroke="url(#mdeep)" strokeWidth="1" opacity=".45"/>
        <polygon points="0,0 5,-3 0,5 -5,-3" fill="#fff" opacity=".08"/>
        <circle cx="0" cy="0" r="1.5" fill="#fff" opacity=".7"><animate attributeName="opacity" values=".3;.9;.3" dur="1s" repeatCount="indefinite"/></circle>
      </g>
    </svg>
  )
}
