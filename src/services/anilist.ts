import { translateText, translateGenre } from "./translate";

const ANILIST_API_URL = "https://graphql.anilist.co";

const formatAnimeTitle = (title: string): string => {
  return title.replace(/Season\s+(\d+)/gi, "S$1");
};

interface AniListResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations: Array<{
      line: number;
      column: number;
    }>;
    path: string[];
  }>;
}

interface AniListAnime {
  id: number;
  title: {
    romaji: string;
    english: string;
  };
  coverImage: {
    large: string;
    medium: string;
    extraLarge: string;
  };
  description: string;
  status: string;
  genres: string[];
  episodes: number;
  nextAiringEpisode?: {
    episode: number;
    airingAt: number;
  };
  airingSchedule?: {
    nodes: Array<{
      episode: number;
      airingAt: number;
    }>;
  };
}

const fetchAniList = async <T>(query: string, variables?: Record<string, any>): Promise<T> => {
  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result: AniListResponse<T> = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
};

export const getAnimeList = async (page: number = 1, perPage: number = 10) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
          description
          status
          genres
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { page, perPage });
  const animeList = await Promise.all(
    result.Page.media.map(async (anime) => ({
      id: anime.id,
      title: formatAnimeTitle(anime.title.english || anime.title.romaji),
      image: anime.coverImage.extraLarge || anime.coverImage.large,
      description: await translateText(anime.description || ""),
      status: anime.status,
      genres: (anime.genres || []).map(translateGenre),
      episodes: anime.episodes,
      isNew: anime.nextAiringEpisode?.episode === 1,
      episode: anime.nextAiringEpisode ? `قسمت ${anime.nextAiringEpisode.episode}` : "قسمت ۱",
    }))
  );

  return animeList;
};

export const getAnimeById = async (id: number) => {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title {
          romaji
          english
        }
        coverImage {
          large
          extraLarge
        }
        description
        status
        genres
        episodes
        airingSchedule {
          nodes {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Media: AniListAnime }>(query, { id });
  const anime = result.Media;

  return {
    id: anime.id,
    title: formatAnimeTitle(anime.title.english || anime.title.romaji),
    image: anime.coverImage.extraLarge || anime.coverImage.large,
    description: await translateText(anime.description || ""),
    status: anime.status,
    genres: (anime.genres || []).map(translateGenre),
    episodes:
      anime.airingSchedule?.nodes.map((node) => ({
        id: node.episode,
        number: node.episode,
        title: `قسمت ${node.episode}`,
      })) || [],
  };
};

export const getSchedule = async () => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Determine current season
  let season = "";
  if (month >= 0 && month < 3) season = "WINTER";
  else if (month >= 3 && month < 6) season = "SPRING";
  else if (month >= 6 && month < 9) season = "SUMMER";
  else season = "FALL";

  const query = `
    query ($year: Int, $season: MediaSeason) {
      Page(page: 1, perPage: 50) {
        media(
          type: ANIME,
          status: RELEASING,
          season: $season,
          seasonYear: $year,
          sort: POPULARITY_DESC
        ) {
          id
          title {
            romaji
            english
          }
          coverImage {
            medium
          }
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { year, season });
  const schedule: Record<
    string,
    Array<{
      id: number;
      title: string;
      image: string;
      time: string;
      episode: string;
    }>
  > = {
    شنبه: [],
    یکشنبه: [],
    دوشنبه: [],
    سه‌شنبه: [],
    چهارشنبه: [],
    پنجشنبه: [],
    جمعه: [],
  };

  result.Page.media.forEach((anime) => {
    if (anime.nextAiringEpisode) {
      const date = new Date(anime.nextAiringEpisode.airingAt * 1000);
      const day = date.toLocaleDateString("fa-IR", { weekday: "long" });

      if (schedule[day]) {
        schedule[day].push({
          id: anime.id,
          title: formatAnimeTitle(anime.title.english || anime.title.romaji),
          image: anime.coverImage.medium,
          time: date.toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          episode: `قسمت ${anime.nextAiringEpisode.episode}`,
        });
      }
    }
  });

  return schedule;
};

export const getLatestAnime = async (page: number = 1, perPage: number = 10) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Determine current season
  let season = "";
  if (month >= 0 && month < 3) season = "WINTER";
  else if (month >= 3 && month < 6) season = "SPRING";
  else if (month >= 6 && month < 9) season = "SUMMER";
  else season = "FALL";

  const query = `
    query ($page: Int, $perPage: Int, $year: Int, $season: MediaSeason) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
          description
          status
          genres
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, {
    page,
    perPage,
    year,
    season,
  });

  const animeList = await Promise.all(
    result.Page.media.map(async (anime) => ({
      id: anime.id,
      title: formatAnimeTitle(anime.title.english || anime.title.romaji),
      image: anime.coverImage.extraLarge,
      description: await translateText(anime.description || ""),
      status: anime.status,
      genres: (anime.genres || []).map(translateGenre),
      episodes: anime.episodes,
      isNew: anime.nextAiringEpisode?.episode === 1,
      episode: anime.nextAiringEpisode ? `قسمت ${anime.nextAiringEpisode.episode}` : "قسمت ۱",
    }))
  );

  return animeList;
};

export const getPopularAnime = async (page: number = 1, perPage: number = 10) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
          description
          status
          genres
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { page, perPage });
  const animeList = await Promise.all(
    result.Page.media.map(async (anime) => ({
      id: anime.id,
      title: formatAnimeTitle(anime.title.english || anime.title.romaji),
      image: anime.coverImage.extraLarge || anime.coverImage.large,
      description: await translateText(anime.description || ""),
      status: anime.status,
      genres: (anime.genres || []).map(translateGenre),
      episodes: anime.episodes,
      isNew: anime.nextAiringEpisode?.episode === 1,
      episode: anime.nextAiringEpisode ? `قسمت ${anime.nextAiringEpisode.episode}` : "قسمت ۱",
    }))
  );

  return animeList;
};

export const getNewEpisodes = async (page: number = 1, perPage: number = 10) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
          description
          status
          genres
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { page, perPage });
  const animeList = await Promise.all(
    result.Page.media.map(async (anime) => ({
      id: anime.id,
      title: formatAnimeTitle(anime.title.english || anime.title.romaji),
      image: anime.coverImage.extraLarge || anime.coverImage.large,
      description: await translateText(anime.description || ""),
      status: anime.status,
      genres: (anime.genres || []).map(translateGenre),
      episodes: anime.episodes,
      isNew: anime.nextAiringEpisode?.episode === 1,
      episode: anime.nextAiringEpisode ? `قسمت ${anime.nextAiringEpisode.episode}` : "قسمت ۱",
    }))
  );

  return animeList;
};

export const getAnimeMovies = async (page: number = 1, perPage: number = 10) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
          description
          status
          genres
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { page, perPage });
  const animeList = await Promise.all(
    result.Page.media.map(async (anime) => ({
      id: anime.id,
      title: formatAnimeTitle(anime.title.english || anime.title.romaji),
      image: anime.coverImage.extraLarge || anime.coverImage.large,
      description: await translateText(anime.description || ""),
      status: anime.status,
      genres: (anime.genres || []).map(translateGenre),
      episodes: anime.episodes,
      isNew: anime.nextAiringEpisode?.episode === 1,
      episode: "فیلم",
    }))
  );

  return animeList;
};

export const getMostPopularAnime = async (page: number = 1, perPage: number = 10) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
          description
          status
          genres
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { page, perPage });
  const animeList = await Promise.all(
    result.Page.media.map(async (anime) => ({
      id: anime.id,
      title: formatAnimeTitle(anime.title.english || anime.title.romaji),
      image: anime.coverImage.extraLarge || anime.coverImage.large,
      description: await translateText(anime.description || ""),
      status: anime.status,
      genres: (anime.genres || []).map(translateGenre),
      episodes: anime.episodes,
      isNew: anime.nextAiringEpisode?.episode === 1,
      episode: anime.nextAiringEpisode ? `قسمت ${anime.nextAiringEpisode.episode}` : "قسمت ۱",
    }))
  );

  return animeList;
};
