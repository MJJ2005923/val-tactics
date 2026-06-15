/** 管理员认证 — 内存存储，避免 sessionStorage XSS 泄露 */
let _adminKey: string | null = null

export function setAdminKey(key: string) { _adminKey = key }
export function clearAdminKey() { _adminKey = null }
export function getAdminKey() { return _adminKey }
export function isAdmin() { return !!_adminKey }

/** 通过 admin API 写操作（替代直接 supabase 调用，避免 anon key 泄露权限） */
async function adminAction(action: string, params: Record<string, any>) {
  const key = getAdminKey()
  if (!key) throw new Error('未登录管理面板')
  const resp = await fetch('/api/admin/insights-action', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, action, ...params }),
  })
  const d = await resp.json()
  if (!resp.ok) throw new Error(d.error || '操作失败')
  return d
}

export async function approveInsight(id: string, status: 'approved' | 'rejected') {
  return adminAction(status === 'approved' ? 'approve-insight' : 'reject-insight', { id, status })
}

export async function approveContribution(id: string, status: 'approved' | 'rejected') {
  return adminAction(status === 'approved' ? 'approve-contribution' : 'reject-contribution', { id, status })
}

export async function editInsight(id: string, content: string) {
  return adminAction('edit-insight', { id, content })
}
