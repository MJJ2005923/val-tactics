import { useEffect } from 'react'
import styles from './HelpPanel.module.css'

interface Props {
  onClose: () => void
}

export default function HelpPanel({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
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
            <h3>🎯 这个网站是干什么的？</h3>
            <p>这是一个让你在网页上<strong>画战术</strong>的工具。你可以像用战术白板一样，在地图上标出每个队友的技能往哪放、烟雾封哪里、闪光丢哪里。</p>
            <p>操作很简单：<strong>左边拖技能 → 丢到地图上 → 搞定。</strong>技能范围和游戏里一模一样。</p>
          </div>

          <div className={styles.section}>
            <h3>🗺️ 地图怎么用？</h3>
            <ul>
              <li><strong>滚轮缩放</strong>：上下滚动鼠标滚轮可以放大缩小地图</li>
              <li><strong>切换攻防</strong>：顶部导航栏切换进攻方/防守方视角</li>
              <li><strong>12 张地图</strong>：亚海悬城、源工重镇、森寒冬港、霓虹町、深海明珠、裂变峡谷、隐士修所、日落之城、莲华古城、微风岛屿、幽邃地窖、盐海矿镇</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🧑‍🎤 怎么放技能？</h3>
            <ul>
              <li><strong>找特工</strong>：左侧面板搜索或滚动找到你要的特工，点击展开</li>
              <li><strong>拖技能</strong>：把技能拖到地图上</li>
              <li><strong>圆形技能</strong>（烟雾、燃烧弹等）：拖过去松开就行，直接显示范围圈</li>
              <li><strong>线型技能</strong>（墙、无人机等）：松开后<strong>点两下</strong>——先点起点，再点终点，确定方向和长度</li>
              <li><strong>自由画线</strong>（水墙等）：按住鼠标画出路径，松手确认</li>
              <li><strong>钛狐Q / 幻棱Q</strong>：左键 = 一段，右键 = 两段（模拟弹跳）</li>
              <li>画线过程中按 <strong>ESC</strong> 可取消</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>👁️ 为什么有些技能只显示小图标？</h3>
            <p>为了让地图不乱，大部分技能默认只显示一个小图标。</p>
            <ul>
              <li><strong>点击图标</strong> → 展开完整技能范围</li>
              <li><strong>点其他地方取消选中</strong> → 恢复小图标</li>
              <li>右下角 <strong>👁️ 按钮</strong> → 一键显示/隐藏所有技能范围</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🏗️ 怎么组建阵容？</h3>
            <ul>
              <li>把特工头像拖到左侧面板顶部的<strong>阵容槽</strong>里（进攻/防守各 5 人）</li>
              <li><strong>右键</strong>槽位里的头像 → 移除</li>
              <li><strong>左键</strong>槽位里的头像 → 快速跳转到那个特工</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>✏️ 绘图工具有哪些？</h3>
            <table className={styles.table}>
              <thead><tr><th>工具</th><th>怎么用</th></tr></thead>
              <tbody>
                <tr><td>✋ 选择</td><td>点击选中任何元素，拖拽移动位置</td></tr>
                <tr><td>✏️ 画笔</td><td>按住鼠标自由画线</td></tr>
                <tr><td>📏 直线</td><td>点两下画一条直线</td></tr>
                <tr><td>➡️ 箭头</td><td>画带箭头的方向线</td></tr>
                <tr><td>⬜ 矩形</td><td>拖拽画矩形框</td></tr>
                <tr><td>⭕ 圆形</td><td>拖拽画圆形圈</td></tr>
                <tr><td>T 文字</td><td>点击地图任意位置添加文字标注</td></tr>
                <tr><td>🧹 橡皮</td><td>点击任何元素直接删除</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h3>🎬 怎么录制和回放？</h3>
            <ul>
              <li>点击右侧时间轴的 <strong>⏺ 录制</strong> → 开始录制</li>
              <li>每放一个技能自动记录一步</li>
              <li>再点一下停止录制，双击轨道名可以<strong>重命名</strong></li>
              <li>点击轨道上的 <strong>▶ 播放</strong> → 技能按顺序显示</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>💾 怎么保存和分享？</h3>
            <ul>
              <li><strong>保存进度</strong>：导航栏「保存进度」→ 存到浏览器</li>
              <li><strong>导出图片</strong>：导航栏「导出」→「导出图片」→ 下载 PNG</li>
              <li><strong>分享链接</strong>：导航栏「导出」→「分享链接」→ 复制发给队友</li>
              <li><strong>模板管理</strong>：导航栏「模板管理」→ 保存/加载多个战术方案</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>⌨️ 快捷键</h3>
            <table className={styles.table}>
              <thead><tr><th>按键</th><th>功能</th></tr></thead>
              <tbody>
                <tr><td><kbd>Delete</kbd></td><td>删除选中的元素</td></tr>
                <tr><td><kbd>Ctrl + Z</kbd></td><td>撤销</td></tr>
                <tr><td><kbd>Ctrl + Shift + Z</kbd></td><td>重做</td></tr>
                <tr><td><kbd>Ctrl + D</kbd></td><td>复制选中的元素</td></tr>
                <tr><td><kbd>Ctrl + S</kbd></td><td>打开模板管理器</td></tr>
                <tr><td><kbd>ESC</kbd></td><td>取消当前操作 / 关闭弹窗</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h3>🎨 技能颜色对照</h3>
            <table className={styles.table}>
              <thead><tr><th>颜色</th><th>类型</th><th>举例</th></tr></thead>
              <tbody>
                <tr><td>🟢 绿色</td><td>烟雾</td><td>欧门黑瘴、炼狱空投烟幕</td></tr>
                <tr><td>🟡 黄色</td><td>闪光</td><td>铁臂闪点爆破、不死鸟闪光曲球</td></tr>
                <tr><td>🔴 红色</td><td>伤害</td><td>雷兹彩雷飞溅、炼狱燃烧榴弹</td></tr>
                <tr><td>🔵 蓝色</td><td>侦查</td><td>猎枭寻敌箭、黑梦诡眼</td></tr>
                <tr><td>🟣 紫色</td><td>控制</td><td>贤者薄冰、星礈重力之阱</td></tr>
                <tr><td>💚 亮绿</td><td>治疗</td><td>贤者逢春、斯凯愈生之息</td></tr>
                <tr><td>🟠 橙色</td><td>位移</td><td>Jett 逐风、欧门践影</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h3>🔧 特殊技巧</h3>
            <ul>
              <li><strong>钢锁 C</strong>（十字屏障）：选中后四臂末端出现白色手柄，拖拽独立调节每根线的长短</li>
              <li><strong>奇乐 Q</strong>（自动哨兵）：双层圆形——内圈触发范围 + 外圈虚线警戒范围</li>
              <li><strong>铁臂 C</strong>（剧震余波）：锥形区域显示三道冲击波椭圆环</li>
              <li><strong>海神 X</strong>（清算）：放置后有波浪动画沿路径推进</li>
              <li><strong>盖可 X / 斯凯 Q</strong>：路径终点带圆形爆炸范围</li>
              <li><strong>钛狐 X</strong>（末日审判）：起点圆形 + 矩形轰炸区</li>
              <li><strong>钛狐 Q / 幻棱 Q</strong>：右键可以画两段折线</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
