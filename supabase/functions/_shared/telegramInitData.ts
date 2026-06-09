export type InitDataParseResult = {
  hash: string
  authDate: number | null
  userId: number | null
  pairs: Array<{ key: string; value: string }>
}

/** Parse initData query string — values stay URL-encoded (required for HMAC). */
export const parseTelegramInitData = (initData: string): InitDataParseResult | null => {
  const raw = initData.trim()
  if (!raw) return null

  const pairs: Array<{ key: string; value: string }> = []
  let hash = ''
  let authDate: number | null = null
  let userId: number | null = null

  for (const part of raw.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq <= 0) continue

    const key = part.slice(0, eq)
    const value = part.slice(eq + 1)

    if (key === 'hash') {
      hash = value.toLowerCase()
      continue
    }

    pairs.push({ key, value })

    if (key === 'auth_date') {
      const ts = Number(value)
      if (Number.isFinite(ts)) authDate = ts
    }

    if (key === 'user') {
      try {
        const decoded = decodeURIComponent(value.replace(/\+/g, ' '))
        const user = JSON.parse(decoded) as { id?: number }
        if (typeof user.id === 'number' && user.id > 0) userId = user.id
      } catch {
        // ignore
      }
    }
  }

  if (!hash) return null

  return { hash, authDate, userId, pairs }
}

const bytesToHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
export const verifyTelegramInitData = async (
  initData: string,
  botToken: string
): Promise<{ userId: number | null; reason: string }> => {
  const parsed = parseTelegramInitData(initData)
  if (!parsed) return { userId: null, reason: 'empty_or_invalid_init_data' }

  const token = botToken.trim()
  if (!token) return { userId: null, reason: 'bot_token_missing' }

  const dataCheckString = parsed.pairs
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((p) => `${p.key}=${p.value}`)
    .join('\n')

  const encoder = new TextEncoder()

  const webAppKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const secretKey = await crypto.subtle.sign('HMAC', webAppKey, encoder.encode(token))

  const hmacKey = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(dataCheckString))
  const calcHash = bytesToHex(signed)

  if (calcHash !== parsed.hash) {
    return { userId: null, reason: 'hash_mismatch' }
  }

  if (parsed.authDate != null) {
    const ageSec = Math.abs(Math.floor(Date.now() / 1000) - parsed.authDate)
    if (ageSec > 604800) return { userId: null, reason: 'auth_date_expired' }
  }

  if (parsed.userId == null) return { userId: null, reason: 'invalid_user_id' }

  return { userId: parsed.userId, reason: 'ok' }
}
