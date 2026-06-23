import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-portal-token',
}

type NotifyPayload = {
  ok?: boolean
  campaign_id?: string
  anime_id?: string
  anime_title?: string | null
  episode_number?: number
  title?: string
  message?: string
  href?: string
  inbox_created?: number
  telegram_candidates?: number
  telegram_user_ids?: number[]
  error?: string
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()

  if (!botToken) {
    return json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, 500)
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Missing Supabase env' }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const portalToken = String(body.portalToken ?? '').trim()
  const animeId = String(body.animeId ?? '').trim()
  const episodeNumber = Number(body.episodeNumber)
  const sendTelegram = body.sendTelegram !== false
  const miniAppBaseUrl = String(body.miniAppBaseUrl ?? '').trim().replace(/\/$/, '')

  if (!portalToken || !animeId || !Number.isFinite(episodeNumber) || episodeNumber < 1) {
    return json({ error: 'portalToken, animeId and episodeNumber required' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: notifyData, error: notifyError } = await supabase.rpc('admin_notify_episode_release', {
    p_portal_token: portalToken,
    p_anime_id: animeId,
    p_episode_number: Math.floor(episodeNumber),
  })

  if (notifyError) {
    const msg = notifyError.message ?? 'notify RPC failed'
    if (msg.includes('admin_notify_episode_release')) {
      return json({ error: 'Run sql/supabase-notifications.sql in SQL Editor first' }, 500)
    }
    return json({ error: msg }, 400)
  }

  const payload = (notifyData ?? {}) as NotifyPayload
  if (!payload.ok || !payload.campaign_id) {
    return json({ error: 'Unexpected notify response' }, 500)
  }

  let telegramSent = 0
  const telegramErrors: Array<{ chat_id: number; message: string }> = []

  if (sendTelegram && Array.isArray(payload.telegram_user_ids) && payload.telegram_user_ids.length > 0) {
    const webAppUrl =
      miniAppBaseUrl && payload.href
        ? `${miniAppBaseUrl}${payload.href.startsWith('/') ? payload.href : `/${payload.href}`}`
        : null

    const text = payload.message ?? 'قسمت جدید منتشر شد.'

    const replyMarkup =
      webAppUrl != null
        ? {
            inline_keyboard: [
              [{ text: 'مشاهده در شیوری', web_app: { url: webAppUrl } }],
            ],
          }
        : undefined

    for (const chatId of payload.telegram_user_ids) {
      if (!Number.isFinite(chatId)) continue

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            disable_web_page_preview: true,
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          }),
        })

        const tgJson = (await tgRes.json()) as { ok?: boolean; description?: string }
        if (tgJson.ok) {
          telegramSent += 1
        } else {
          telegramErrors.push({
            chat_id: chatId,
            message: tgJson.description ?? 'sendMessage failed',
          })
        }
      } catch (e) {
        telegramErrors.push({
          chat_id: chatId,
          message: e instanceof Error ? e.message : 'sendMessage error',
        })
      }

      await sleep(55)
    }

    await supabase.rpc('mark_notifications_telegram_sent', {
      p_campaign_id: payload.campaign_id,
      p_sent_count: telegramSent,
    })
  }

  return json({
    ok: true,
    campaign_id: payload.campaign_id,
    inbox_created: payload.inbox_created ?? 0,
    telegram_candidates: payload.telegram_candidates ?? 0,
    telegram_sent: telegramSent,
    telegram_errors: telegramErrors.slice(0, 10),
  })
})
