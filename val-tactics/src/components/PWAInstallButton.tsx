import { useState, useEffect } from 'react'

export default function PWAInstallButton() {
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // 已安装则跳过
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e)
      setShow(true)
    }

    const installedHandler = () => {
      setInstalled(true)
      setShow(false)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  if (installed || !show) return null

  const handleInstall = async () => {
    if (!deferred) return
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null)
    setShow(false)
  }

  return (
    <button
      onClick={handleInstall}
      style={{
        padding: '5px 14px', background: 'linear-gradient(135deg, #05F8F8, #E349ED)',
        border: 'none', borderRadius: 8, color: '#07040c', fontSize: 12,
        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        letterSpacing: '.5px', animation: 'pulse 2s ease-in-out infinite',
      }}
      title="安装到桌面"
    >
      安装应用
    </button>
  )
}
