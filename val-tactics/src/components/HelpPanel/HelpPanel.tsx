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
            <h3>🎯 这是什么？</h3>
            <p>无畏契约战术板 —— 网页端战术布置工具。你可以在游戏地图上放置特工技能、绘制进攻路线、录制战术演示，还可以使用 <strong>T教练 AI</strong> 分析战术、推荐阵容、解答任何游戏问题。</p>
          </div>

          <div className={styles.section}>
            <h3>🤖 T教练 AI</h3>
            <ul>
              <li>点击导航栏 <strong>T教练</strong> → 选择「主页面」打开全屏 AI 对话</li>
              <li>也可以选择「侧边栏」在右侧边栏快速提问</li>
              <li>AI 掌握全部 29 位特工技能、12 张地图、战术术语、武器数据等完整知识库</li>
              <li>开启「基础信息」后，AI 能读取你战术板上的特工站位、技能布置</li>
              <li>导入比赛数据后，AI 可以分析你的个人表现和改进方向</li>
              <li>对话记录自动保存，👍👎 评分帮我们优化 AI</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🗺️ 地图操作</h3>
            <ul>
              <li><strong>滚轮缩放</strong>：放大地图细节</li>
              <li><strong>拖拽平移</strong>：用选择工具或右键拖拽移动地图</li>
              <li><strong>旋转</strong>：右下角旋转按钮，配合攻防切换自动翻转视角</li>
              <li>12 张地图全覆盖：亚海悬城、源工重镇、森寒冬港、霓虹町、深海明珠、裂变峡谷、隐士修所、日落之城、莲华古城、微风岛屿、幽邃地窖、盐海矿镇</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🧑‍🎤 技能放置</h3>
            <ul>
              <li>左侧面板找到特工 → 点击展开 → 拖动技能到地图上</li>
              <li><strong>圆形技能</strong>（烟雾、燃烧弹）：拖动即放置</li>
              <li><strong>线型/锥形技能</strong>：放置后点击地图确定方向和长度</li>
              <li>右下角 <strong>👁️ 按钮</strong> 一键显示/隐藏所有技能范围</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>✏️ 绘图工具</h3>
            <table className={styles.table}>
              <thead><tr><th>工具</th><th>用法</th></tr></thead>
              <tbody>
                <tr><td>✋ 选择/平移</td><td>选中元素、拖拽移动、右键平移地图</td></tr>
                <tr><td>✏️ 画笔</td><td>自由画线标注</td></tr>
                <tr><td>📏 直线 / ➡️ 箭头</td><td>画直线或带箭头的方向线</td></tr>
                <tr><td>⬜ 矩形 / ⭕ 圆形</td><td>拖拽画形状标注</td></tr>
                <tr><td>T 文字</td><td>点击地图添加文字</td></tr>
                <tr><td>🧹 橡皮</td><td>点击删除任意元素</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h3>🎬 录制与回放</h3>
            <ul>
              <li>时间轴面板 → 点击录制 → 每放一个技能自动记录</li>
              <li>支持多轨道、重命名、播放控制</li>
              <li>回放时技能按时间顺序依次出现</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>💾 保存与分享</h3>
            <ul>
              <li><strong>保存进度</strong>：存到浏览器本地</li>
              <li><strong>模板管理</strong>：保存/加载多个战术方案</li>
              <li><strong>导出图片</strong>：下载战术板 PNG 截图</li>
              <li><strong>分享链接</strong>：复制链接发给队友（只读查看）</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🌐 社区</h3>
            <ul>
              <li>点击导航栏 <strong>社区</strong> 进入，左侧导航切换板块</li>
              <li><strong>战术广场</strong>：浏览/搜索/发布战术，点赞收藏评论</li>
              <li><strong>论坛大厅</strong>：7种分类发帖（战术讨论/英雄攻略/地图分析/开黑组队/赛事/训练/自定义）</li>
              <li><strong>技能点位</strong>：选地图→特工→技能→地图点选坐标+4张截图发布</li>
              <li><strong>个人主页</strong>：5个Tab查看发布/点赞/收藏的内容，留言板互动</li>
              <li><strong>创作者排行</strong>：创作榜/点赞榜/关注榜/收藏榜</li>
              <li><strong>通知铃铛</strong>：实时提醒点赞/评论/关注/收藏</li>
              <li><strong>收藏与赞过</strong>：侧边栏入口查看全部，可按类型筛选</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🔐 账号系统</h3>
            <ul>
              <li><strong>注册/登录</strong>：导航栏点击登录，使用邮箱注册</li>
              <li><strong>跨设备同步</strong>：套餐和自备 Key 状态与账号绑定，换设备登录自动恢复</li>
              <li><strong>忘记密码</strong>：登录弹窗中点「忘记密码」，输入邮箱即可重置</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>💳 套餐与收费</h3>
            <ul>
              <li><strong>免费套餐</strong>：快速模式，每日 5 次</li>
              <li><strong>标准 ¥30/月</strong>：全部 4 种模式 — 快速 / 均衡 / 推理 / 深度</li>
              <li><strong>季付 ¥75/季（¥25/月）</strong>：省 ¥15，同标准配额</li>
              <li><strong>年付 ¥288/年（¥24/月）</strong>：省 ¥72，同标准配额</li>
              <li>激活码通过社群渠道购买，在侧边栏输入激活即可升级套餐</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>📊 比赛数据分析</h3>
            <ul>
              <li>导航栏 T教练 → <strong>数据分析</strong> 打开独立页面</li>
              <li>手动录入或 CSV 批量导入比赛记录</li>
              <li>自动统计胜率、K/D、地图表现、特工表现</li>
              <li>支持记录双方阵容、首杀、残局、伤害、MVP 等详细数据</li>
              <li>AI 对话中可选择引用比赛数据，获得个性化分析</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>⌨️ 快捷键</h3>
            <table className={styles.table}>
              <thead><tr><th>按键</th><th>功能</th></tr></thead>
              <tbody>
                <tr><td><kbd>Delete</kbd></td><td>删除选中元素</td></tr>
                <tr><td><kbd>Ctrl + Z</kbd></td><td>撤销</td></tr>
                <tr><td><kbd>Ctrl + Shift + Z</kbd></td><td>重做</td></tr>
                <tr><td><kbd>Ctrl + D</kbd></td><td>复制选中元素</td></tr>
                <tr><td><kbd>Ctrl + S</kbd></td><td>打开模板管理器</td></tr>
                <tr><td><kbd>ESC</kbd></td><td>取消操作 / 关闭弹窗</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h3>❤️ 支持我们</h3>
            <p>战术板面板功能完全免费。AI 服务的运营成本由套餐订阅和你的打赏支持。感谢每一位支持者！</p>
          </div>

          <div className={styles.section}>
            <h3>🏆 特别鸣谢</h3>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8,
              padding: 16, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(227,73,237,.04), rgba(5,248,248,.03))',
              border: '1px solid rgba(227,73,237,.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 12 }}>🥇 至尊赞助</span>
                <span style={{ color: 'rgba(255,255,255,.15)', fontSize: 11 }}>期待第一位</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ color: 'rgba(255,255,255,.25)', fontSize: 12 }}>🥈 金牌赞助</span>
                <span style={{ color: 'rgba(255,255,255,.15)', fontSize: 11 }}>期待第一位</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 12 }}>🥉 银牌赞助</span>
                <span style={{ color: 'rgba(255,255,255,.15)', fontSize: 11 }}>期待第一位</span>
              </div>
            </div>
            <p style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,.2)' }}>
              赞助名单将显示在公网版本中。赞助后请联系开发者添加你的名字。
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
