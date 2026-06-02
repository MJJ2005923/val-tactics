import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import styles from './Toast.module.css'

interface ToastItem { id: number; msg: string }

const ToastContext = createContext<((msg: string) => void) | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx || ((msg: string) => { alert(msg) })
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const add = useCallback((msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className={styles.container}>
        {toasts.map(t => (
          <div key={t.id} className={styles.toast}>{t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
