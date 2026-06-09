import { supabase, hasSupabaseConfig } from '../lib/supabase'

export type FilePack = {
  id: string
  slug: string
  title: string
  description: string | null
  is_active: boolean
  created_at: string | null
  file_count: number
}

export type FilePackItem = {
  pack_id: string
  file_key: string
  sort_order: number
  created_at: string | null
  file_name?: string | null
}

export const getAllFilePacks = async (): Promise<FilePack[]> => {
  if (!hasSupabaseConfig) return []
  const { data, error } = await supabase
    .from('file_packs')
    .select('id, slug, title, description, is_active, created_at, file_pack_items(count)')
    .order('created_at', { ascending: false })

  if (error) {
    if (import.meta.env.DEV) console.warn('getAllFilePacks:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: String(row?.id ?? ''),
    slug: String(row?.slug ?? '').trim(),
    title: String(row?.title ?? '').trim(),
    description: typeof row?.description === 'string' ? row.description : (row?.description ?? null),
    is_active: typeof row?.is_active === 'boolean' ? row.is_active : Boolean(row?.is_active ?? true),
    created_at: typeof row?.created_at === 'string' ? row.created_at : (row?.created_at ?? null),
    file_count:
      typeof row?.file_pack_items?.[0]?.count === 'number'
        ? row.file_pack_items[0].count
        : Number(row?.file_pack_items?.[0]?.count) || 0,
  }))
}

export const upsertFilePack = async (payload: {
  id?: string
  slug: string
  title: string
  description: string | null
  is_active: boolean
}): Promise<FilePack> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const row: any = {
    slug: payload.slug,
    title: payload.title,
    description: payload.description,
    is_active: payload.is_active,
  }

  if (payload.id) row.id = payload.id

  const { data, error } = await supabase
    .from('file_packs')
    .upsert(row, { onConflict: payload.id ? 'id' : 'slug' })
    .select('id, slug, title, description, is_active, created_at')
    .single()

  if (error) throw error

  return {
    id: String(data?.id ?? ''),
    slug: String(data?.slug ?? '').trim(),
    title: String(data?.title ?? '').trim(),
    description: typeof data?.description === 'string' ? data.description : (data?.description ?? null),
    is_active: typeof data?.is_active === 'boolean' ? data.is_active : Boolean(data?.is_active ?? true),
    created_at: typeof data?.created_at === 'string' ? data.created_at : (data?.created_at ?? null),
    file_count: 0,
  }
}

export const deleteFilePack = async (id: string): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const delItems = await supabase.from('file_pack_items').delete().eq('pack_id', id)
  if (delItems.error) throw delItems.error

  const delPack = await supabase.from('file_packs').delete().eq('id', id)
  if (delPack.error) throw delPack.error
}

export const getFilePackItems = async (packId: string): Promise<FilePackItem[]> => {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('file_pack_items')
    .select('pack_id, file_key, sort_order, created_at, files(file_name)')
    .eq('pack_id', packId)
    .order('sort_order', { ascending: true })

  if (error) {
    if (import.meta.env.DEV) console.warn('getFilePackItems:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    pack_id: String(row?.pack_id ?? ''),
    file_key: String(row?.file_key ?? ''),
    sort_order: typeof row?.sort_order === 'number' ? row.sort_order : Number(row?.sort_order ?? 0) || 0,
    created_at: typeof row?.created_at === 'string' ? row.created_at : (row?.created_at ?? null),
    file_name: typeof row?.files?.file_name === 'string' ? row.files.file_name : (row?.files?.file_name ?? null),
  }))
}

export const addFileToPack = async (payload: {
  packId: string
  fileKey: string
  sortOrder: number
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const row: any = {
    pack_id: payload.packId,
    file_key: payload.fileKey,
    sort_order: payload.sortOrder,
  }

  const { error } = await supabase
    .from('file_pack_items')
    .upsert(row, { onConflict: 'pack_id,file_key' })

  if (error) throw error
}

export const removeFileFromPack = async (payload: { packId: string; fileKey: string }): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const { error } = await supabase
    .from('file_pack_items')
    .delete()
    .eq('pack_id', payload.packId)
    .eq('file_key', payload.fileKey)

  if (error) throw error
}

export const updatePackItemSortOrder = async (payload: {
  packId: string
  fileKey: string
  sortOrder: number
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const { error } = await supabase
    .from('file_pack_items')
    .update({ sort_order: payload.sortOrder })
    .eq('pack_id', payload.packId)
    .eq('file_key', payload.fileKey)

  if (error) throw error
}

export const reorderFilePackItems = async (payload: {
  packId: string
  orderedFileKeys: string[]
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  await Promise.all(
    payload.orderedFileKeys.map((fileKey, index) =>
      updatePackItemSortOrder({
        packId: payload.packId,
        fileKey,
        sortOrder: index + 1,
      })
    )
  )
}
