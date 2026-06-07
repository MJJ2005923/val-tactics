import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import styles from './AuthModal.module.css'

interface Props {
  onClose: () => void
}

export default function AuthModal({ onClose }: Props) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码')
      return
    }
    if (password.length < 6) {
      setError('密码至少6位')
      return
    }
    setLoading(true)
    const fn = isSignUp ? signUp : signIn
    const result = await fn(email.trim(), password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (isSignUp) {
      setSuccess('注册成功！请检查邮箱确认链接。确认后即可登录。')
    } else {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>✕</button>
        <h2 className={styles.title}>{isSignUp ? '注册账号' : '登录'}</h2>
        <p className={styles.sub}>{isSignUp ? '创建账号以跨设备同步套餐' : '登录以恢复你的套餐和数据'}</p>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.field}>
          <div className={styles.label}>邮箱</div>
          <input className={styles.input} type="email" value={email}
            placeholder="your@email.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
        </div>
        <div className={styles.field}>
          <div className={styles.label}>密码</div>
          <input className={styles.input} type="password" value={password}
            placeholder="至少6位"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
        </div>

        <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
        </button>

        <div className={styles.switch} onClick={() => { setIsSignUp(v => !v); setError(''); setSuccess('') }}>
          {isSignUp ? '已有账号？点此登录' : '没有账号？点此注册'}
        </div>
      </div>
    </div>
  )
}
