import styles from './PrivacyPanel.module.css'

interface Props { onClose: () => void }

export default function PrivacyPanel({ onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className={styles.close} onClick={onClose}>✕</button>
        <h2 className={styles.title}>隐私条款</h2>
        <p className={styles.date}>生效日期：2026年6月7日</p>

        <div className={styles.section}>
          <h3>1. 我们收集什么</h3>
          <p>注册账号时收集您的邮箱地址。您与 AI 的对话内容会匿名存储用于提升服务质量。您在战术板上的操作数据（地图、特工、技能布置）仅存储在您的浏览器本地，我们不会读取或上传。</p>
        </div>

        <div className={styles.section}>
          <h3>2. 数据存储位置</h3>
          <p>您的账号信息存储在 Supabase 云服务。战术板数据和比赛记录存储在您浏览器的 localStorage 中，仅您自己可以访问。AI 对话记录存储在 Supabase 数据库，用于优化 AI 回答质量。</p>
        </div>

        <div className={styles.section}>
          <h3>3. API Key</h3>
          <p>您填入的第三方 API Key（如 DeepSeek、OpenAI）仅存储在浏览器本地，通过加密连接直接发送至对应服务商，我们不会读取、存储或转发您的 Key。</p>
        </div>

        <div className={styles.section}>
          <h3>4. 数据共享</h3>
          <p>我们不会将您的个人数据出售或分享给第三方。匿名化的 AI 问答对可能用于优化 AI 模型和知识库，但不会关联您的个人身份。</p>
        </div>

        <div className={styles.section}>
          <h3>5. 您的权利</h3>
          <p>您可以随时删除账号（在登录状态下联系我们），账号删除后所有关联数据将被清除。您可以随时清除浏览器 localStorage 来删除本地存储的战术数据。</p>
        </div>

        <div className={styles.section}>
          <h3>6. 免责声明</h3>
          <p>本网站为玩家自制工具，与 Riot Games 无关。VALORANT 及相关资产版权归 Riot Games 所有。本网站提供的 AI 战术建议仅供参考，不保证准确性。</p>
        </div>

        <div className={styles.section}>
          <h3>7. 联系我们</h3>
          <p>如有隐私相关问题，请通过爱发电页面联系开发者。</p>
        </div>
      </div>
    </div>
  )
}
