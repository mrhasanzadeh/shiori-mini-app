import { supabase } from "../lib/supabase";

type Episode = {
  id: number;
  number: number;
  title: string;
};

export type AnimeCard = {
  id: number;
  title: string;
  image: string;
  description: string;
  status: string;
  genres: string[];
  episodes?: number;
  isNew?: boolean;
  episode?: string;
  averageScore?: number;
};

export type AnimeDetails = {
  id: number;
  title: string;
  image: string;
  description: string;
  status: string;
  genres: string[];
  episodes: Episode[];
  studios: string[];
  producers: string[];
  season: string;
  startDate: string;
  endDate: string;
};

const toAnimeCard = (row: any): AnimeCard => ({
  id: row.id,
  title: row.title || "بدون عنوان",
  image: row.image || "",
  description: row.synopsis || "",
  status: row.status || "ongoing",
  genres: Array.isArray(row.genres) ? row.genres : [],
  episodes: typeof row.episodes === "number" ? row.episodes : undefined,
  isNew: Boolean(row.is_new),
  episode: row.latest_episode ? `قسمت ${row.latest_episode}` : undefined,
  averageScore: typeof row.average_score === "number" ? row.average_score : undefined,
});

// Fetch anime with genres using join
export const getLatestAnime = async () => {
  const { data, error } = await supabase
    .from("anime")
    .select(`
      id,
      title,
      image,
      synopsis,
      status,
      episodes,
      average_score,
      created_at,
      anime_genres(genres(name))
    `)
    .order("created_at", { ascending: false })
    .limit(24);
  
  if (error) {
    console.error("Error fetching latest anime:", error);
    throw error;
  }
  
  return (data || []).map((row: any) => ({
    ...toAnimeCard(row),
    genres: row.anime_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [],
  }));
};

export const getPopularAnime = async () => {
  const { data, error } = await supabase
    .from("anime")
    .select(`
      id,
      title,
      image,
      synopsis,
      status,
      episodes,
      average_score,
      anime_genres(genres(name))
    `)
    .order("average_score", { ascending: false })
    .limit(24);
  
  if (error) throw error;
  
  return (data || []).map((row: any) => ({
    ...toAnimeCard(row),
    genres: row.anime_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [],
  }));
};

export const getNewEpisodes = async () => {
  const { data, error} = await supabase
    .from("anime")
    .select(`
      id,
      title,
      image,
      synopsis,
      status,
      episodes,
      average_score,
      created_at,
      anime_genres(genres(name))
    `)
    .eq("status", "ongoing")
    .order("created_at", { ascending: false })
    .limit(24);
  
  if (error) throw error;
  
  return (data || []).map((row: any) => ({
    ...toAnimeCard(row),
    genres: row.anime_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [],
    isNew: true,
  }));
};

export const getAnimeMovies = async () => {
  const { data, error } = await supabase
    .from("anime")
    .select(`
      id,
      title,
      image,
      synopsis,
      status,
      episodes,
      average_score,
      anime_genres(genres(name))
    `)
    .eq("category", "movie")
    .order("average_score", { ascending: false })
    .limit(24);
  
  if (error) throw error;
  
  return (data || []).map((row: any) => ({
    ...toAnimeCard(row),
    genres: row.anime_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [],
  }));
};

export const getAnimeById = async (id: number): Promise<AnimeDetails> => {
  const { data, error } = await supabase
    .from("anime")
    .select(`
      id,
      title,
      image,
      synopsis,
      status,
      episodes,
      season,
      aired_from,
      aired_to,
      anime_genres(genres(name)),
      anime_studios(studios(name)),
      anime_episodes(id, title, episode_number)
    `)
    .eq("id", id)
    .single();
  
  if (error) throw error;

  const anime = data as any;
  return {
    id: anime.id,
    title: anime.title,
    image: anime.image || "",
    description: anime.synopsis || "",
    status: anime.status || "ongoing",
    genres: anime.anime_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [],
    episodes: anime.anime_episodes?.map((ae: any) => ({
      id: ae.id || 0,
      number: ae.episode_number || 0,
      title: ae.title || `قسمت ${ae.episode_number || 0}`,
    })).sort((a: any, b: any) => a.number - b.number) || [],
    studios: anime.anime_studios?.map((as: any) => as.studios?.name).filter(Boolean) || [],
    producers: [],
    season: anime.season || "",
    startDate: anime.aired_from || "",
    endDate: anime.aired_to || "",
  };
};

export const getSimilarAnime = async (animeId: number) => {
  // Get genres of the current anime
  const { data: currentAnime } = await supabase
    .from("anime")
    .select("anime_genres(genre_id)")
    .eq("id", animeId)
    .single();

  if (!currentAnime) return [];

  const genreIds = currentAnime.anime_genres?.map((ag: any) => ag.genre_id) || [];
  
  if (genreIds.length === 0) return [];

  // Find anime with similar genres
  const { data, error } = await supabase
    .from("anime")
    .select(`
      id,
      title,
      image,
      status,
      average_score,
      anime_genres!inner(genre_id, genres(name))
    `)
    .neq("id", animeId)
    .in("anime_genres.genre_id", genreIds)
    .order("average_score", { ascending: false })
    .limit(24);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    image: row.image || "",
    status: row.status || "ongoing",
    genres: row.anime_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [],
    score: row.average_score,
  }));
};

export const getSchedule = async () => {
  // For now, return empty schedule - you can implement based on your needs
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

export const searchAnime = async (search: string) => {
  const term = search.trim();
  if (!term) return [] as AnimeCard[];
  
  const { data, error } = await supabase
    .from("anime")
    .select(`
      id,
      title,
      image,
      synopsis,
      status,
      episodes,
      average_score,
      anime_genres(genres(name))
    `)
    .or(`title.ilike.%${term}%,title_ja.ilike.%${term}%`)
    .limit(50);
  
  if (error) throw error;
  
  return (data || []).map((row: any) => ({
    ...toAnimeCard(row),
    genres: row.anime_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [],
  }));
};
