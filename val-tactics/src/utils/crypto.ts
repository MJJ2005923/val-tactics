/**
 * API Key 本地加密/解密工具
 * 使用 XOR + Base64，绑定用户 ID 作为密钥因子
 * 防止 localStorage 明文存储被直接窃取
 */

const SALT = 'val-tactics-key-v1'

function getKey(uid: string): string {
  return uid + SALT
}

/** 加密文本（API Key → localStorage） */
export function encryptKey(plaintext: string, uid: string): string {
  if (!plaintext) return ''
  const key = getKey(uid)
  let result = ''
  for (let i = 0; i < plaintext.length; i++) {
    result += String.fromCharCode(plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  // 用 base64 安全存储，避免不可见字符问题
  try {
    return btoa(unescape(encodeURIComponent(result)))
  } catch {
    return btoa(result)
  }
}

/** 解密文本（localStorage → API Key） */
export function decryptKey(encoded: string, uid: string): string {
  if (!encoded) return ''
  try {
    const raw = decodeURIComponent(escape(atob(encoded)))
    const key = getKey(uid)
    let result = ''
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  } catch {
    // 旧版明文兼容：返回原值
    return encoded
  }
}
