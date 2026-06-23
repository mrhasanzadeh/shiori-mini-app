export type InitDataParseResult = {
  hash: string
  authDate: number | null
  userId: number | null
  signature: string | null
  pairsEncoded: Array<{ key: string; value: string }>
  pairsDecoded: Array<{ key: string; value: string }>
  pairsNoSignatureDecoded: Array<{ key: string; value: string }>
}

const decodeInitValue = (value: string): string =>
  decodeURIComponent(value.replace(/\+/g, ' '))

/** Parse initData query string */
export const parseTelegramInitData = (initData: string): InitDataParseResult | null => {
  const raw = initData.trim()
  if (!raw) return null

  const pairsEncoded: Array<{ key: string; value: string }> = []
  const pairsDecoded: Array<{ key: string; value: string }> = []
  const pairsNoSignatureDecoded: Array<{ key: string; value: string }> = []
  let hash = ''
  let authDate: number | null = null
  let userId: number | null = null
  let signature: string | null = null

  for (const part of raw.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq <= 0) continue

    const key = part.slice(0, eq)
    const valueEncoded = part.slice(eq + 1)

    if (key === 'hash') {
      hash = valueEncoded.toLowerCase()
      continue
    }

    pairsEncoded.push({ key, value: valueEncoded })

    let valueDecoded = valueEncoded
    try {
      valueDecoded = decodeInitValue(valueEncoded)
    } catch {
      valueDecoded = valueEncoded
    }

    pairsDecoded.push({ key, value: valueDecoded })
    if (key !== 'signature') {
      pairsNoSignatureDecoded.push({ key, value: valueDecoded })
    }

    if (key === 'auth_date') {
      const ts = Number(valueEncoded)
      if (Number.isFinite(ts)) authDate = ts
    }

    if (key === 'signature') {
      signature = valueDecoded
    }

    if (key === 'user') {
      try {
        const user = JSON.parse(valueDecoded) as { id?: number }
        if (typeof user.id === 'number' && user.id > 0) userId = user.id
      } catch {
        // ignore
      }
    }
  }

  if (!hash) return null

  return {
    hash,
    authDate,
    userId,
    signature,
    pairsEncoded,
    pairsDecoded,
    pairsNoSignatureDecoded,
  }
}

const bytesToHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

const buildCheckString = (pairs: Array<{ key: string; value: string }>): string =>
  pairs
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((p) => `${p.key}=${p.value}`)
    .join('\n')

const hmacSha256Hex = async (keyBytes: ArrayBuffer, message: string): Promise<string> => {
  const encoder = new TextEncoder()
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(message))
  return bytesToHex(signed)
}

const computeBotTokenHash = async (
  botToken: string,
  checkString: string
): Promise<string> => {
  const encoder = new TextEncoder()
  const webAppKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const secretKey = await crypto.subtle.sign('HMAC', webAppKey, encoder.encode(botToken.trim()))
  return hmacSha256Hex(secretKey, checkString)
}

const padBase64 = (value: string): string => {
  const mod = value.length % 4
  if (mod === 0) return value
  return value + '='.repeat(4 - mod)
}

const TELEGRAM_PRODUCTION_PUBLIC_KEY_HEX =
  'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d'

const verifyEd25519ThirdParty = async (
  botToken: string,
  signature: string,
  pairs: Array<{ key: string; value: string }>
): Promise<boolean> => {
  const botId = botToken.trim().split(':')[0]
  if (!botId) return false

  const payload = `${botId}:WebAppData\n${buildCheckString(pairs)}`
  const encoder = new TextEncoder()

  try {
    const publicKey = await crypto.subtle.importKey(
      'raw',
      Uint8Array.from(
        TELEGRAM_PRODUCTION_PUBLIC_KEY_HEX.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
      ),
      'Ed25519',
      false,
      ['verify']
    )

    const signatureBytes = Uint8Array.from(atob(padBase64(signature.replace(/-/g, '+').replace(/_/g, '/'))), (c) =>
      c.charCodeAt(0)
    )

    return crypto.subtle.verify('Ed25519', publicKey, signatureBytes, encoder.encode(payload))
  } catch {
    return false
  }
}

/** https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
export const verifyTelegramInitData = async (
  initData: string,
  botToken: string
): Promise<{ userId: number | null; reason: string; method?: string }> => {
  const parsed = parseTelegramInitData(initData)
  if (!parsed) return { userId: null, reason: 'empty_or_invalid_init_data' }

  const token = botToken.trim()
  if (!token) return { userId: null, reason: 'bot_token_missing' }

  const candidates: Array<{ mode: string; checkString: string }> = [
    { mode: 'decoded_all', checkString: buildCheckString(parsed.pairsDecoded) },
    {
      mode: 'decoded_no_signature',
      checkString: buildCheckString(parsed.pairsNoSignatureDecoded),
    },
    { mode: 'encoded_all', checkString: buildCheckString(parsed.pairsEncoded) },
  ]

  for (const candidate of candidates) {
    const calcHash = await computeBotTokenHash(token, candidate.checkString)
    if (calcHash === parsed.hash) {
      if (parsed.authDate != null) {
        const ageSec = Math.abs(Math.floor(Date.now() / 1000) - parsed.authDate)
        if (ageSec > 604800) return { userId: null, reason: 'auth_date_expired' }
      }
      if (parsed.userId == null) return { userId: null, reason: 'invalid_user_id' }
      return { userId: parsed.userId, reason: 'ok', method: candidate.mode }
    }
  }

  if (parsed.signature) {
    const ed25519Ok = await verifyEd25519ThirdParty(
      token,
      parsed.signature,
      parsed.pairsNoSignatureDecoded
    )
    if (ed25519Ok) {
      if (parsed.authDate != null) {
        const ageSec = Math.abs(Math.floor(Date.now() / 1000) - parsed.authDate)
        if (ageSec > 604800) return { userId: null, reason: 'auth_date_expired' }
      }
      if (parsed.userId == null) return { userId: null, reason: 'invalid_user_id' }
      return { userId: parsed.userId, reason: 'ok', method: 'ed25519_third_party' }
    }
  }

  return { userId: null, reason: 'hash_mismatch' }
}
