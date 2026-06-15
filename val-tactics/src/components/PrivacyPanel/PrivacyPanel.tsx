import styles from './PrivacyPanel.module.css'

interface Props { onClose: () => void }

export default function PrivacyPanel({ onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className={styles.close} onClick={onClose}>✕</button>
        <h2 className={styles.title}>隐私条款</h2>
        <p className={styles.date}>生效日期：2026年6月15日</p>

        <div className={styles.section}>
          <h3>1. 我们收集什么</h3>
          <p><strong>账号信息</strong>：注册时的邮箱地址、用户名、头像、个人简介。</p>
          <p><strong>社区内容</strong>：您公开发布的战术分享、技能点位、论坛帖子、评论，以及您的创作者统计数据（创作数、获赞数、粉丝数、被收藏数）。</p>
          <p><strong>互动数据</strong>：您的点赞、收藏、关注、评论记录。关注列表对其他人可见，收藏和赞过仅自己可查看。</p>
          <p><strong>AI 对话</strong>：您与 T教练 的对话内容会以匿名化方式存储（含当前地图、攻防方、阵容上下文），用于优化 AI 回答质量。</p>
          <p><strong>使用数据</strong>：各 AI 模式的每日使用次数，用于套餐配额控制。</p>
        </div>

        <div className={styles.section}>
          <h3>2. 数据存储位置</h3>
          <p>账号信息、社区内容、互动记录和 AI 对话存储在 Supabase 云服务。战术板操作数据（地图、特工、技能布置）和比赛记录存储在您浏览器的 localStorage 中，仅您自己可以访问。</p>
          <p>您上传的技能点位截图存储在 Supabase Storage，公开可访问。</p>
        </div>

        <div className={styles.section}>
          <h3>3. 内容审核</h3>
          <p>您发布的社区内容（战术、帖子、点位、评论）会通过自动化系统进行审核，检测违规内容。审核不通过的内容不会公开展示。</p>
        </div>

        <div className={styles.section}>
          <h3>4. API Key</h3>
          <p>您填入的第三方 API Key 仅存储在浏览器本地，通过加密连接直接发送至对应服务商。我们不会读取、存储或转发您的 Key。</p>
        </div>

        <div className={styles.section}>
          <h3>5. 付费信息</h3>
          <p>您的套餐类型、激活时间和使用次数存储在 Supabase 和 Cloudflare KV。激活码为一次性使用，使用后即标记为已用。</p>
        </div>

        <div className={styles.section}>
          <h3>6. 数据共享</h3>
          <p>您的公开社区内容（战术、帖子、点位、评论、用户名、头像）对所有访问者可见。创作者排行中的统计数据为公开展示。</p>
          <p>我们不会将您的邮箱、对话记录等非公开数据出售或分享给第三方。匿名化的 AI 问答对可能用于优化知识库，不关联个人身份。</p>
        </div>

        <div className={styles.section}>
          <h3>7. 您的权利</h3>
          <p>您可以随时在社区中删除自己发布的内容（战术、帖子、点位、评论）。删除账号后，所有关联的账号数据和社区内容将被清除。</p>
          <p>您可以随时清除浏览器 localStorage 来删除本地存储的战术数据和比赛记录。</p>
        </div>

        <div className={styles.section}>
          <h3>8. 免责声明</h3>
          <p>本网站为玩家自制工具，与 Riot Games 无关。VALORANT 及相关资产版权归 Riot Games 所有。本网站提供的 AI 战术建议仅供参考，不保证准确性。</p>
        </div>

        <div className={styles.section}>
          <h3>9. 联系我们</h3>
          <p>如有隐私相关问题，请通过爱发电页面联系开发者。</p>
        </div>
      </div>
    </div>
  )
}
