import { useEffect } from 'react'
import styles from './HelpPanel.module.css'

interface Props { onClose: () => void }

export default function HelpPanel({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📖 使用手册</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>

          <div className={styles.section}>
            <h3>🚀 快速上手</h3>
            <ol>
              <li>打开网站 → 看到启动画面 → 点击 <strong>「进入战术板」</strong> 或按 <kbd>Enter</kbd></li>
              <li>左边找到特工，点开，把技能图标拖到地图上</li>
              <li>搞定！你已经放好了第一个战术标记</li>
            </ol>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', marginTop: 6 }}>💡 如果只想问 AI 问题，不需要画图。顶部点「T教练」就能和 AI 对话。</p>
          </div>

          <div className={styles.section}>
            <h3>🗺️ 地图操作</h3>
            <ul>
              <li><strong>换地图</strong>：顶部工具栏选择器切换，12 张地图全覆盖</li>
              <li><strong>滚轮缩放</strong>：放大地图细节，右下角 +/− 按钮也行</li>
              <li><strong>拖拽平移</strong>：按住鼠标拖拽，或右下角方向键</li>
              <li><strong>切换攻防视角</strong>：顶部选择进攻方/防守方，地图自动旋转</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🧑‍🎤 放置技能</h3>
            <ul>
              <li>左侧面板 → 找到特工（支持搜索中文/英文名）→ 点击展开</li>
              <li>把技能图标（C/Q/E/X）拖到地图上就放好了</li>
              <li>放好后可拖拽移动，圆形技能顶部小圆点可旋转</li>
              <li>技能颜色：绿=烟 · 黄=闪 · 红=伤害 · 蓝=侦查 · 紫=控制 · 橙=位移 · 亮绿=治疗</li>
              <li>右下角 <strong>👁️ 按钮</strong> 一键显示/隐藏所有技能范围</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>👥 组阵容</h3>
            <ul>
              <li>特工面板顶部有阵容区，拖拽头像到进攻方/防守方格子里</li>
              <li>每方最多 5 人，左键点已放头像可跳转到该特工，右键移除</li>
              <li>T教练提问时 AI 会读取你的阵容，建议更精准</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>✏️ 画图标注</h3>
            <table className={styles.table}>
              <thead><tr><th>想做什么</th><th>怎么操作</th></tr></thead>
              <tbody>
                <tr><td>画箭头</td><td>选「箭头」，按住拖拽</td></tr>
                <tr><td>画方块</td><td>选「矩形」，按住拖拽</td></tr>
                <tr><td>画圈</td><td>选「圆形」，按住拖拽</td></tr>
                <tr><td>写文字</td><td>选「文字」，点地图输入。双击可改</td></tr>
                <tr><td>随便画</td><td>选「画笔」，自由画线</td></tr>
                <tr><td>擦掉</td><td>选「橡皮」，点一下要删的</td></tr>
                <tr><td>移动</td><td>选「选择」（手形），拖拽任意元素</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', marginTop: 4 }}>画之前可调颜色、线条粗细、文字大小。</p>
          </div>

          <div className={styles.section}>
            <h3>💾 保存与分享</h3>
            <ul>
              <li><strong>自动保存</strong>：操作自动存浏览器，关闭重开还在</li>
              <li><strong>导出图片</strong>：顶部「导出」→ 下载 PNG 截图发给队友</li>
              <li><strong>分享链接</strong>：复制链接发给队友，点开就能看你的战术</li>
              <li><strong>模板管理</strong>：保存多个战术来回切换，也可导出 JSON 永久保存</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🎬 录制与回放</h3>
            <ul>
              <li>时间轴面板 → 点录制 → 每放一个技能自动记录</li>
              <li>支持多轨道、重命名、播放控制</li>
              <li>回放时技能按时间顺序依次出现</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🤖 T教练 AI</h3>
            <ul>
              <li>顶部点 <strong>「T教练」</strong> 进入，可选择全屏对话或侧边栏快速提问</li>
              <li>直接打字问，就像跟教练聊天。例如：
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', display: 'block', marginTop: 4 }}>
                  「亚海悬城推荐什么阵容？」「婕提在裂变峡谷怎么玩？」「分析我现在的战术布局」
                </span>
              </li>
              <li>AI 会把棋盘上的特工站位和技能也考虑进去，<strong>先摆阵容再提问更准</strong></li>
              <li>左侧可设置：基础信息（读棋盘）、数据分析（引用对局）、对局信息（地图+敌我阵容）</li>
            </ul>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 8 }}>⚡ 四种模式：快速（日常问答）· 均衡（战术分析）· 推理（深度研究）· 深度（复杂推演）</p>
          </div>

          <div className={styles.section}>
            <h3>🌐 社区广场</h3>
            <ul>
              <li>导航栏「社区」进入，左侧导航切换板块</li>
              <li><strong>战术广场</strong>：浏览/搜索/发布战术，点赞收藏评论，可加载到自己的战术板修改</li>
              <li><strong>技能点位</strong>：按地图→特工→技能筛选，每条含坐标+截图+难度评级</li>
              <li><strong>论坛大厅</strong>：7 种分类发帖（战术讨论/英雄攻略/地图分析/开黑组队/赛事/训练/其他）</li>
              <li><strong>个人主页</strong>：展示发布/赞过/收藏，关注数和粉丝数，留言板互动</li>
              <li><strong>创作者排行</strong>：创作榜/点赞榜/关注榜/收藏榜</li>
              <li><strong>通知铃铛</strong>：实时提醒点赞/评论/关注/收藏</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🔐 账号系统</h3>
            <ul>
              <li><strong>注册/登录</strong>：导航栏点击登录，邮箱注册</li>
              <li><strong>跨设备同步</strong>：套餐和自备 Key 与账号绑定，换设备自动恢复</li>
              <li><strong>忘记密码</strong>：登录弹窗点「忘记密码」，输入邮箱重置</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>💳 套餐与收费</h3>
            <ul>
              <li><strong>免费套餐</strong>：快速模式，每日 5 次</li>
              <li><strong>标准 ¥30/月</strong>：全部 4 种模式，各有独立次数额度</li>
              <li><strong>季付 ¥88（¥29.33/月）</strong> · <strong>年付 ¥298（¥24.83/月）</strong></li>
              <li><strong>自备 API Key ¥19.9</strong>：用自己的 Key，不限次数</li>
              <li>激活码通过社群购买，在 T教练 侧边栏输入即可升级</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>📊 比赛数据分析</h3>
            <ul>
              <li>导航栏 T教练 → <strong>数据分析</strong> 打开独立页面</li>
              <li>手动录入或 CSV 批量导入比赛记录</li>
              <li>自动统计胜率、K/D、地图表现、特工表现</li>
              <li>AI 对话中可选择引用比赛数据，获得个性化分析</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>⌨️ 快捷键</h3>
            <table className={styles.table}>
              <thead><tr><th>按键</th><th>功能</th></tr></thead>
              <tbody>
                <tr><td><kbd>Delete / Backspace</kbd></td><td>删除选中元素</td></tr>
                <tr><td><kbd>Ctrl + Z</kbd></td><td>撤销</td></tr>
                <tr><td><kbd>Ctrl + Shift + Z</kbd></td><td>重做</td></tr>
                <tr><td><kbd>Ctrl + D</kbd></td><td>复制选中元素</td></tr>
                <tr><td><kbd>Ctrl + S</kbd></td><td>打开模板管理器</td></tr>
                <tr><td><kbd>ESC</kbd></td><td>取消操作 / 关闭弹窗</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h3>❓ 常见问题</h3>
            <p style={{ fontWeight: 600, fontSize: 12, marginTop: 6 }}>换了电脑，战术还在吗？</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 8 }}>数据存在当前浏览器。需要跨设备请用「导出 JSON」保存，新设备「导入 JSON」恢复。</p>
            <p style={{ fontWeight: 600, fontSize: 12 }}>免费版能用多久？</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 8 }}>永久免费！每天 5 次快速模式。想用更多模式升级套餐即可。</p>
            <p style={{ fontWeight: 600, fontSize: 12 }}>怎么删除自己发布的内容？</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 8 }}>进入详情页，点删除按钮（确认后不可恢复）。</p>
            <p style={{ fontWeight: 600, fontSize: 12 }}>可以用自己的 API Key 吗？</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>可以。T教练页面左侧「自备 API Key」，¥19.9/月解锁，填入你的 Key 不限次数。</p>
          </div>

          <div className={styles.section}>
            <h3>❤️ 支持我们</h3>
            <p>战术板功能完全免费。AI 服务运营成本由套餐订阅和打赏支持。感谢每一位支持者！</p>
            <p style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,.2)' }}>
              赞助名单显示在公网版本中。赞助后联系开发者添加你的名字。
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
