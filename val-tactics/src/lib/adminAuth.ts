/** 管理员认证 — 内存存储，避免 sessionStorage XSS 泄露 */
let _adminKey: string | null = null

export function setAdminKey(key: string) { _adminKey = key }
export function clearAdminKey() { _adminKey = null }
export function getAdminKey() { return _adminKey }
export function isAdmin() { return !!_adminKey }
