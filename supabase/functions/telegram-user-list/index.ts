import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { verifyTelegramInitData } from '../_shared/telegramInitData.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ListRow = {
  anime_id: string
  episodes_watched: number
  user_rating: number | null
  updated_at: string
}

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

  const initData = String(body.initData ?? '').trim()
  const action = String(body.action ?? 'list').trim()

  const verified = await verifyTelegramInitData(initData, botToken)

  if (action === 'debug') {
    return json({
      reason: verified.reason,
      verified_user_id: verified.userId,
      init_data_length: initData.length,
    })
  }

  if (verified.userId == null) {
    return json({ error: 'invalid telegram init data', reason: verified.reason }, 401)
  }

  const userId = verified.userId
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (action === 'register') {
    const expectedId = Number(body.telegram_user_id)
    if (!Number.isFinite(expectedId) || expectedId !== userId) {
      return json({ error: 'telegram_user_id mismatch' }, 400)
    }

    const { error } = await supabase.rpc('register_telegram_user_visit_internal', {
      p_telegram_user_id: userId,
      p_first_name: String(body.first_name ?? ''),
      p_last_name: body.last_name != null ? String(body.last_name) : null,
      p_username: body.username != null ? String(body.username) : null,
      p_language_code: body.language_code != null ? String(body.language_code) : null,
      p_photo_url: body.photo_url != null ? String(body.photo_url) : null,
      p_is_premium: Boolean(body.is_premium),
    })

    if (error?.code === 'PGRST202' || error?.message?.includes('register_telegram_user_visit_internal')) {
      return json({ error: 'Run supabase-rls-security-phase2-edge.sql in SQL Editor first' }, 500)
    }
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true })
  }

  if (action === 'list') {
    const { data, error } = await supabase
      .from('user_anime_list')
      .select('anime_id, episodes_watched, user_rating, updated_at')
      .eq('telegram_user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) return json({ error: error.message }, 500)
    return json({ items: (data ?? []) as ListRow[] })
  }

  if (action === 'upsert') {
    const animeId = String(body.anime_id ?? '').trim()
    if (!animeId) return json({ error: 'anime_id required' }, 400)

    const row: Record<string, unknown> = {
      telegram_user_id: userId,
      anime_id: animeId,
    }

    if (body.episodes_watched !== undefined && body.episodes_watched !== null) {
      row.episodes_watched = Math.max(0, Math.floor(Number(body.episodes_watched)))
    } else if (action === 'upsert') {
      row.episodes_watched = 0
    }
    if (body.user_rating !== undefined) {
      row.user_rating = body.user_rating === null ? null : Number(body.user_rating)
    }

    const { error } = await supabase
      .from('user_anime_list')
      .upsert(row, { onConflict: 'telegram_user_id,anime_id' })

    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  if (action === 'remove') {
    const animeId = String(body.anime_id ?? '').trim()
    if (!animeId) return json({ error: 'anime_id required' }, 400)

    const { error } = await supabase
      .from('user_anime_list')
      .delete()
      .eq('telegram_user_id', userId)
      .eq('anime_id', animeId)

    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  return json({ error: 'unknown action' }, 400)
})

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
