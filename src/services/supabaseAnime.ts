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
  title: row.title,
  image: row.image,
  description: row.description ?? "",
  status: row.status ?? "RELEASING",
  genres: Array.isArray(row.genres) ? row.genres : [],
  episodes: typeof row.episodes === "number" ? row.episodes : undefined,
  isNew: Boolean(row.is_new),
  episode: row.episode ?? undefined,
  averageScore: typeof row.average_score === "number" ? row.average_score : undefined,
});

// Expect a table named `anime_cards` with columns:
// id (int), title (text), image (text), description (text), status (text),
// genres (text[]), episodes (int), is_new (bool), episode (text), average_score (int)

export const getLatestAnime = async () => {
  const { data, error } = await supabase
    .from("anime_cards")
    .select("*")
    .eq("category", "latest")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data || []).map(toAnimeCard);
};

export const getPopularAnime = async () => {
  const { data, error } = await supabase
    .from("anime_cards")
    .select("*")
    .eq("category", "popular")
    .order("average_score", { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data || []).map(toAnimeCard);
};

export const getNewEpisodes = async () => {
  const { data, error } = await supabase
    .from("anime_cards")
    .select("*")
    .eq("category", "episodes")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data || []).map(toAnimeCard);
};

export const getAnimeMovies = async () => {
  const { data, error } = await supabase
    .from("anime_cards")
    .select("*")
    .eq("category", "movies")
    .order("average_score", { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data || []).map(toAnimeCard);
};

export const getAnimeById = async (id: number): Promise<AnimeDetails> => {
  const { data, error } = await supabase
    .from("anime_details")
    .select(
      "id,title,image,description,status,genres,episodes,studios,producers,season,start_date,end_date"
    )
    .eq("id", id)
    .single();
  if (error) throw error;

  const details = data as any;
  return {
    id: details.id,
    title: details.title,
    image: details.image,
    description: details.description ?? "",
    status: details.status ?? "RELEASING",
    genres: Array.isArray(details.genres) ? details.genres : [],
    episodes: Array.isArray(details.episodes)
      ? details.episodes.map((e: any, i: number) => ({
          id: e.id ?? i + 1,
          number: e.number ?? i + 1,
          title: e.title ?? `قسمت ${i + 1}`,
        }))
      : [],
    studios: Array.isArray(details.studios) ? details.studios : [],
    producers: Array.isArray(details.producers) ? details.producers : [],
    season: details.season ?? "",
    startDate: details.start_date ?? "",
    endDate: details.end_date ?? "",
  };
};

export const getSimilarAnime = async (_id: number) => {
  const { data, error } = await supabase
    .from("anime_similar")
    .select("id,title,image,status,genres,average_score")
    .limit(24);
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    image: row.image,
    status: row.status ?? "RELEASING",
    genres: Array.isArray(row.genres) ? row.genres : [],
    score: typeof row.average_score === "number" ? row.average_score : undefined,
  }));
};

export const getSchedule = async () => {
  const { data, error } = await supabase
    .from("anime_schedule")
    .select("day,id,title,time,episode,image,current_season,current_year")
    .order("time", { ascending: true });
  if (error) throw error;

  const schedule: Record<
    string,
    Array<{ id: number; title: string; time: string; episode: string; image: string }>
  > = {};
  let currentSeason = "";
  let currentYear = new Date().getFullYear();

  (data || []).forEach((row: any) => {
    schedule[row.day] ||= [];
    schedule[row.day].push({
      id: row.id,
      title: row.title,
      time: row.time,
      episode: row.episode,
      image: row.image,
    });
    currentSeason = row.current_season || currentSeason;
    currentYear = row.current_year || currentYear;
  });

  return { schedule, currentSeason, currentYear };
};

export const searchAnime = async (search: string) => {
  const term = search.trim();
  if (!term) return [] as AnimeCard[];
  const { data, error } = await supabase
    .from("anime_cards")
    .select("*")
    .ilike("title", `%${term}%`)
    .limit(50);
  if (error) throw error;
  return (data || []).map(toAnimeCard);
};
