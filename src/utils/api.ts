// App-level API wrapper
import * as supa from "../services/supabaseAnime";

// Lightweight card shape used across Home/Search UIs
export type UiAnimeCard = {
  id: number | string;
  title: string;
  image: string;
  episode: string;
  isNew?: boolean;
  description?: string;
  genres?: string[];
};

import type { AnimeListItem } from "../store/animeStore";

const toCacheAnime = (c: any): UiAnimeCard => ({
  id: c.id,
  title: c.title,
  image: c.image,
  episode: c.episode ?? "قسمت ۱",
  isNew: Boolean(c.isNew || c.is_new),
  description: c.description ?? "",
  genres: Array.isArray(c.genres) ? c.genres : [],
});

const toListItem = (c: any): AnimeListItem => ({
  id: c.id,
  title: c.title,
  image: c.image,
  description: c.description ?? "",
  status: c.status ?? "RELEASING",
  genres: Array.isArray(c.genres) ? c.genres : [],
  episodes: typeof c.episodes === "number" ? c.episodes : 1,
  isNew: Boolean(c.isNew || c.is_new),
  episode: c.episode ?? "قسمت ۱",
});

// Returns items shaped for AnimeList store (AnimeListItem[])
export const fetchAnimeList = async (_section?: string): Promise<AnimeListItem[]> => {
  const data = await supa.getAllAnime();
  return data.map(toListItem);
};

// Returns items shaped for cache cards on Home/Search (UiAnimeCard[])
// آرگومان section برای سازگاری با کد موجود پذیرفته می‌شود اما نادیده گرفته می‌شود
export const fetchAnimeCards = async (_section?: string): Promise<UiAnimeCard[]> => {
  const data = await supa.getAllAnime();
  return data.map(toCacheAnime);
};

// دریافت جزئیات یک انیمه + لیست قسمت‌ها از جدول episodes (با لینک دانلود هر قسمت)
export const fetchAnimeById = async (id: number | string) => {
  const allAnime = await supa.getAllAnime();
  const anime = allAnime.find((a) => String(a.id) === String(id));
  
  if (!anime) {
    throw new Error(`Anime with id ${id} not found`);
  }

  // اول از جدول episodes می‌گیریم (با download_link)؛ اگر خالی بود از تعداد در anime لیست ساختگی
  const episodesFromDb = await supa.getEpisodesByAnimeId(anime.id);
  const episodesList =
    episodesFromDb.length > 0
      ? episodesFromDb
      : Array.from(
          { length: typeof anime.episodes === "number" ? anime.episodes : 0 },
          (_, i) => ({
            id: i + 1,
            number: i + 1,
            title: `قسمت ${i + 1}`,
            download_link: undefined as string | undefined,
          })
        );

  return {
    id: anime.id,
    title: anime.title,
    image: anime.image,
    description: anime.description,
    status: anime.status,
    genres: anime.genres,
    episodes: episodesList,
    studios: anime.studio ? [anime.studio] : [],
    producers: [],
    season: anime.season ?? "",
    startDate: anime.startDate ?? "",
    endDate: anime.endDate ?? "",
  };
};

// دریافت schedule (ساده‌سازی شده - خالی برمی‌گرداند)
export const fetchSchedule = async () => {
  const schedule: Record<string, Array<{ id: number; title: string; time: string; episode: string; image: string }>> = {
    "شنبه": [],
    "یکشنبه": [],
    "دوشنبه": [],
    "سه‌شنبه": [],
    "چهارشنبه": [],
    "پنج‌شنبه": [],
    "جمعه": [],
  };
  
  const currentSeason = "FALL";
  const currentYear = new Date().getFullYear();

  return { schedule, currentSeason, currentYear };
};

// دریافت انیمه‌های مشابه (ساده‌سازی شده - بر اساس genres)
export const fetchSimilar = async (id: number | string) => {
  const allAnime = await supa.getAllAnime();
  const currentAnime = allAnime.find((a) => String(a.id) === String(id));
  
  if (!currentAnime || !currentAnime.genres || currentAnime.genres.length === 0) {
    return [];
  }
  
  // پیدا کردن انیمه‌های مشابه بر اساس genres مشترک
  const similar = allAnime
    .filter((anime) => {
      if (String(anime.id) === String(id)) return false;
      // اگر حداقل یک genre مشترک داشته باشد
      return anime.genres.some((genre) => currentAnime.genres.includes(genre));
    })
    .sort((a, b) => {
      // مرتب‌سازی بر اساس تعداد genres مشترک و score
      const aCommonGenres = a.genres.filter((g) => currentAnime.genres.includes(g)).length;
      const bCommonGenres = b.genres.filter((g) => currentAnime.genres.includes(g)).length;
      if (aCommonGenres !== bCommonGenres) {
        return bCommonGenres - aCommonGenres;
      }
      return (b.averageScore || 0) - (a.averageScore || 0);
    })
    .slice(0, 24)
    .map((anime) => ({
      id: anime.id,
      title: anime.title,
      image: anime.image || "",
      status: anime.status || "ongoing",
      genres: anime.genres,
      score: anime.averageScore,
    }));
  
  return similar;
};

// جستجو در لیست انیمه‌ها (client-side filtering)
export const fetchSearch = async (q: string, _page: number = 1): Promise<UiAnimeCard[]> => {
  const allAnime = await supa.getAllAnime();
  const searchTerm = q.trim().toLowerCase();
  
  if (!searchTerm) return allAnime.map(toCacheAnime);
  
  const filtered = allAnime.filter((anime) => 
    anime.title.toLowerCase().includes(searchTerm)
  );
  
  return filtered.map(toCacheAnime);
};
