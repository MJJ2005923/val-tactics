import { useState, useEffect } from 'react'
import { canCreateRoom, createRoom, joinRoom, leaveRoom, getRoom, getRoomMembers, transferEditor, kickMember } from '../../lib/roomApi'
import { supabase } from '../../lib/supabase'
import { getProfiles } from '../../lib/community/profiles'
import { useAuth } from '../../store/AuthContext'
import type { Room, RoomMember } from '../../lib/roomApi'
import styles from './RoomPanel.module.css'

/** 广播编辑权变更 */
function broadcastEditorChange(roomId: string, editorId: string) {
  const ch = supabase.channel(`room:${roomId}`)
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      ch.send({ type: 'broadcast', event: 'editor_change', payload: { editorId } })
      setTimeout(() => ch.unsubscribe(), 500)
    }
  })
}

interface Props {
  mapId: string
  side: string
  onClose: () => void
  onJoined?: (roomId: string) => void
}

export default function RoomPanel({ mapId, side, onClose, onJoined }: Props) {
  const { user } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})

  // 加载成员名
  const loadMembers = async (roomId: string) => {
    const mems = await getRoomMembers(roomId)
    setMembers(mems)
    const ids = mems.map(m => m.user_id)
    if (ids.length > 0) {
      const profs = await getProfiles(ids)
      const map: Record<string, string> = {}
      profs.forEach(p => { map[p.id] = p.username?.split('@')[0] || p.id.slice(0, 6) })
      setMemberNames(map)
    }
  }

  // 自动重连已有房间
  useEffect(() => {
    const existingId = localStorage.getItem('room-id')
    if (existingId && !room) {
      getRoom(existingId).then(r => {
        if (r && r.status === 'open') {
          setRoom(r); onJoined?.(r.id)
          if (r.editor_id) localStorage.setItem('room-editor-id', r.editor_id)
        } else {
          localStorage.removeItem('room-id')
          localStorage.removeItem('room-editor-id')
        }
      })
    }
  }, [])

  // 轮询成员列表
  useEffect(() => {
    if (!room) return
    loadMembers(room.id)
    const t = setInterval(() => loadMembers(room.id), 5000)
    return () => clearInterval(t)
  }, [room?.id])

  const handleCreate = async () => {
    if (!user) { setError('请先登录'); return }
    setLoading(true); setError('')
    try {
      // 付费检查
      const perm = await canCreateRoom(user.id)
      if (!perm.allowed) { setError(perm.reason || '无权限创建房间'); setLoading(false); return }
      const r = await createRoom(user.id, mapId, side)
      if (r.room) {
        localStorage.setItem('room-id', r.room.id)
        localStorage.setItem('room-editor-id', user.id) // 房主=编辑者
        onJoined?.(r.room.id)
        setRoom(r.room)
      } else {
        setError(`创建失败：${r.error || '未知错误'}`)
      }
    } catch (e: any) {
      setError(`创建失败：${e.message || '未知错误'}`)
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!user) { setError('请先登录'); return }
    if (code.length !== 6) { setError('请输入6位房间码'); return }
    setLoading(true); setError('')
    const r = await joinRoom(code.trim().toUpperCase(), user.id)
    if (r) {
      localStorage.setItem('room-id', r.id)
      if (r.editor_id) localStorage.setItem('room-editor-id', r.editor_id)
      onJoined?.(r.id)
      setRoom(r)
    } else setError('房间不存在或已满')
    setLoading(false)
  }

  const handleLeave = async () => {
    if (!room || !user) return
    await leaveRoom(room.id, user.id)
    localStorage.removeItem('room-id')
    localStorage.removeItem('room-editor-id')
    setRoom(null); setMembers([])
  }

  const handleTransfer = async (toUserId: string) => {
    if (!room) return
    await transferEditor(room.id, toUserId)
    localStorage.setItem('room-editor-id', toUserId)
    broadcastEditorChange(room.id, toUserId)
    setRoom({ ...room, editor_id: toUserId })
  }

  const handleKick = async (userId: string) => {
    if (!room) return
    await kickMember(room.id, userId)
    loadMembers(room.id)
  }

  const handleDissolve = async () => {
    if (!room) return
    if (!confirm('确定解散房间？所有人将被移除')) return
    await supabase.from('rooms').update({ status: 'closed' }).eq('id', room.id)
    localStorage.removeItem('room-id')
    localStorage.removeItem('room-editor-id')
    // 广播房间关闭
    const ch = supabase.channel(`room:${room.id}`)
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'room_close', payload: {} })
        setTimeout(() => ch.unsubscribe(), 500)
      }
    })
    setRoom(null); setMembers([])
  }

  const handleCopyCode = () => {
    if (!room) return
    navigator.clipboard?.writeText(room.id)
  }

  // 创建/加入界面
  if (!room) {
    return (
      <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>多人协作</div>

          <div className={styles.field}>
            <div className={styles.label}>加入房间</div>
            <input className={styles.input} placeholder="输入6位码" value={code} maxLength={6}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin() }} />
            <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} style={{ marginTop: 6, width: '100%' }}
              onClick={handleJoin} disabled={loading}>加入房间</button>
          </div>

          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.1)', fontSize: 11, margin: '12px 0' }}>或</div>

          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCreate} disabled={loading}>
            {loading ? '创建中...' : '创建新房间'}
          </button>
          {error && <div className={styles.error}>{error}</div>}
          {!user && <div className={styles.error}>请先登录</div>}

          <div style={{ marginTop: 12 }}>
            <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} style={{ width: '100%' }} onClick={onClose}>取消</button>
          </div>
        </div>
      </div>
    )
  }

  // 房间内界面
  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel}>
        <div className={styles.panelTitle}>协作房间</div>

        {/* 房间码 */}
        <div className={styles.roomCode}>
          <div className={styles.roomCodeText}>{room.id}</div>
          <div className={styles.roomCodeLabel}>房间码</div>
          <button className={styles.copyBtn} onClick={handleCopyCode}>复制</button>
        </div>

        {/* 成员 */}
        <div className={styles.memberList}>
          <div className={styles.memberListTitle}>成员 ({members.length}/8)</div>
          {members.map(m => (
            <div key={m.user_id} className={styles.member}>
              <span className={styles.memberName}>{memberNames[m.user_id] || m.user_id.slice(0, 6)}</span>
              {m.user_id === room.host_id && <span className={`${styles.memberRole} ${styles.memberRoleHost}`}>房主</span>}
              {m.user_id === room.editor_id && <span className={`${styles.memberRole} ${styles.memberRoleEditor}`}>编辑中</span>}
              {room.host_id === user?.id && m.user_id !== user.id && (
                <>
                  <button className={styles.btnDanger} onClick={() => handleKick(m.user_id)}>踢出</button>
                  {m.user_id !== room.editor_id && (
                    <button className={styles.btnSecondary} style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleTransfer(m.user_id)}>转让编辑</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* 操作 */}
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleLeave}>离开房间</button>
          {room.host_id === user?.id && (
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDissolve}>解散房间</button>
          )}
        </div>
        <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} style={{ width: '100%', marginTop: 8 }} onClick={onClose}>关闭面板</button>
      </div>
    </div>
  )
}
