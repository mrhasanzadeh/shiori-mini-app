import { supabase, hasSupabaseConfig } from "../lib/supabase";

export type AnimeCard = {
  id: number | string;
  title: string;
  image: string;
  description: string;
  status: string;
  genres: string[];
  episodes_count?: number;
  studio?: string;
  season?: string;
  startDate?: string;
  endDate?: string;
  isNew?: boolean;
  episode?: string;
  averageScore?: number;
};

// نام ستون تصویر در جدول anime — از .env می‌خوانیم؛ پیش‌فرض: cover_image
const IMAGE_COLUMN = (import.meta.env.VITE_ANIME_IMAGE_COLUMN as string) || "cover_image";

const getImageUrl = (row: any): string =>
  row[IMAGE_COLUMN] ?? row.image ?? row.cover_image ?? row.poster ?? row.poster_url ?? row.cover ?? row.thumbnail ?? "";

const toAnimeCard = (row: any): AnimeCard => ({
  id: row.id,
  title: row.title || "بدون عنوان",
  image: getImageUrl(row),
  description: (row.synopsis ?? row.description) ?? "",
  status: row.format || row.status || "ongoing",
  genres: Array.isArray(row.genres) ? row.genres : [],
  episodes_count: typeof row.episodes_count === "number" ? row.episodes_count : undefined,
  studio: row.studio ?? undefined,
  season: row.season ?? undefined,
  startDate: row.start_date ?? undefined,
  endDate: row.end_date ?? undefined,
  isNew: Boolean(row.is_new),
  episode: row.latest_episode ? `قسمت ${row.latest_episode}` : undefined,
  averageScore: typeof row.average_score === "number" ? row.average_score : undefined,
});

// دریافت تمام انیمه‌های موجود در دیتابیس
// مطابق اسکیما: id, title, cover_image, banner_image, format, synopsis, average_score, created_at
// (ستون‌های status و episodes و رابطه anime_genres در این اسکیما نیستند)
export const getAllAnime = async (): Promise<AnimeCard[]> => {
  if (!hasSupabaseConfig) {
    throw new Error(
      "تنظیمات Supabase یافت نشد. در روت پروژه فایل .env بسازید و VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را از پروژه Supabase قرار دهید."
    );
  }

  const { data, error } = await supabase
    .from("anime")
    .select(`
      id,
      title,
      ${IMAGE_COLUMN},
      synopsis,
      format,
      average_score,
      episodes_count,
      studio,
      season,
      start_date,
      end_date,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all anime:", error);
    throw error;
  }

  const list = (data || []).map((row: any) => ({
    ...toAnimeCard(row),
    genres: [],
  }));
  if (import.meta.env.DEV && list.length === 0) {
    console.warn(
      "[getAllAnime] لیست خالی برگشت. اگر در Supabase داده دارید، احتمالاً RLS جلوی خواندن را گرفته. در SQL Editor اجرا کنید:\n" +
        "CREATE POLICY \"Allow public read\" ON anime FOR SELECT USING (true);"
    );
  }
  return list;
};

// نوع هر قسمت برای نمایش در تب «قسمت‌ها»
export type EpisodeItem = {
  id: string | number;
  number: number;
  title: string;
  download_link?: string;
};

// دریافت لیست قسمت‌های یک انیمه از جدول episodes (هر قسمت یک لینک دانلود دارد)
export const getEpisodesByAnimeId = async (animeId: string | number): Promise<EpisodeItem[]> => {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase
    .from("episodes")
    .select("id, episode_number, title, download_link")
    .eq("anime_id", animeId)
    .order("episode_number", { ascending: true });
  if (error) {
    console.warn("getEpisodesByAnimeId:", error.message);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    number: row.episode_number ?? 0,
    title: row.title || `قسمت ${row.episode_number ?? 0}`,
    download_link: row.download_link ?? undefined,
  }));
};
