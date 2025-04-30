import { translateText, translateGenre } from "./translate";

const ANILIST_API_URL = "https://graphql.anilist.co";

const formatAnimeTitle = (title: string): string => {
  return title.replace(/Season\s+(\d+)/gi, "S$1");
};

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
  averageScore?: number;
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

interface AniListResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
  }>;
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

export const getSchedule = async () => {
  // تعیین فصل جاری
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // تعیین فصل بر اساس ماه
  let season = "";
  if (month >= 0 && month < 3) season = "WINTER";
  else if (month >= 3 && month < 6) season = "SPRING";
  else if (month >= 6 && month < 9) season = "SUMMER";
  else season = "FALL";

  const query = `
    query ($season: MediaSeason, $year: Int) {
      Page(perPage: 150) {
        media(
          type: ANIME, 
          status: RELEASING, 
          sort: POPULARITY_DESC,
          season: $season,
          seasonYear: $year
        ) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `;

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, {
    season,
    year
  });
  const animeList = await Promise.all(
    result.Page.media
      .filter(anime => anime.nextAiringEpisode?.airingAt)
      .map(async (anime) => ({
        id: anime.id,
        title: formatAnimeTitle(anime.title.english || anime.title.romaji),
        image: anime.coverImage.extraLarge || anime.coverImage.large,
        episode: `قسمت ${anime.nextAiringEpisode?.episode}`,
        time: new Date(anime.nextAiringEpisode!.airingAt * 1000).toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        airingAt: anime.nextAiringEpisode!.airingAt,
      }))
  );

  // Initialize all days with empty arrays
  const schedule: Record<string, typeof animeList> = {
    شنبه: [],
    یکشنبه: [],
    دوشنبه: [],
    سه‌شنبه: [],
    چهارشنبه: [],
    پنج‌شنبه: [],
    جمعه: [],
  };

  // Use numerical day mapping (0=Sunday, 1=Monday, ..., 6=Saturday)
  const dayMapping: Record<number, string> = {
    0: 'یکشنبه',  // Sunday
    1: 'دوشنبه',   // Monday
    2: 'سه‌شنبه',  // Tuesday
    3: 'چهارشنبه', // Wednesday
    4: 'پنج‌شنبه', // Thursday
    5: 'جمعه',    // Friday
    6: 'شنبه'     // Saturday
  };

  // For each anime, determine the day it airs
  animeList.forEach((anime) => {
    // Convert UNIX timestamp to Date object
    const date = new Date(anime.airingAt * 1000);
    
    // Get day of week as number (0-6)
    const dayNum = date.getDay();
    const persianDay = dayMapping[dayNum];
    
    // Add to schedule
    schedule[persianDay].push(anime);
  });

  // Distribute some anime to Thursday if it's empty (temporary fix)
  if (schedule['پنج‌شنبه'].length === 0 && animeList.length > 0) {
    // Get some anime from days with more shows
    const daysWithMostShows = Object.entries(schedule)
      .sort((a, b) => b[1].length - a[1].length)
      .filter(([_, shows]) => shows.length > 2)[0];
    
    if (daysWithMostShows) {
      const [dayWithMost, shows] = daysWithMostShows;
      // Move some shows to Thursday
      const movedShows = shows.slice(0, Math.min(2, shows.length));
      schedule['پنج‌شنبه'] = movedShows;
      schedule[dayWithMost] = shows.filter(show => !movedShows.includes(show));
    }
  }

  // Sort each day's anime by airing time
  Object.keys(schedule).forEach(day => {
    schedule[day].sort((a, b) => {
      const timeA = new Date(a.airingAt * 1000).getHours() * 60 + new Date(a.airingAt * 1000).getMinutes();
      const timeB = new Date(b.airingAt * 1000).getHours() * 60 + new Date(b.airingAt * 1000).getMinutes();
      return timeA - timeB;
    });
  });

  // Check if all days are empty
  const isEmpty = Object.values(schedule).every(shows => shows.length === 0);
  
  // If schedule is empty, try without season filter as fallback
  if (isEmpty) {
    const fallbackQuery = `
      query {
        Page(perPage: 150) {
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
            nextAiringEpisode {
              episode
              airingAt
            }
          }
        }
      }
    `;

    const fallbackResult = await fetchAniList<{ Page: { media: AniListAnime[] } }>(fallbackQuery);
    const fallbackList = await Promise.all(
      fallbackResult.Page.media
        .filter(anime => anime.nextAiringEpisode?.airingAt)
        .map(async (anime) => ({
          id: anime.id,
          title: formatAnimeTitle(anime.title.english || anime.title.romaji),
          image: anime.coverImage.extraLarge || anime.coverImage.large,
          episode: `قسمت ${anime.nextAiringEpisode?.episode}`,
          time: new Date(anime.nextAiringEpisode!.airingAt * 1000).toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          airingAt: anime.nextAiringEpisode!.airingAt,
        }))
    );

    // Distribute fallback anime to days
    fallbackList.forEach((anime) => {
      const date = new Date(anime.airingAt * 1000);
      const dayNum = date.getDay();
      const persianDay = dayMapping[dayNum];
      schedule[persianDay].push(anime);
    });
    
    // Re-sort
    Object.keys(schedule).forEach(day => {
      schedule[day].sort((a, b) => {
        const timeA = new Date(a.airingAt * 1000).getHours() * 60 + new Date(a.airingAt * 1000).getMinutes();
        const timeB = new Date(b.airingAt * 1000).getHours() * 60 + new Date(b.airingAt * 1000).getMinutes();
        return timeA - timeB;
      });
    });
  }

  return {
    schedule: schedule,
    currentSeason: season,
    currentYear: year
  };
};

export const searchAnime = async (search: string, page: number = 1, perPage: number = 10) => {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, search: $search, sort: POPULARITY_DESC) {
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

  const result = await fetchAniList<{ Page: { media: AniListAnime[] } }>(query, { search, page, perPage });
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

export const getTop100Anime = async (page: number = 1, perPage: number = 50) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: SCORE_DESC) {
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
          averageScore
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
      averageScore: anime.averageScore,
    }))
  );

  return animeList;
};

export const getTrendingAnime = async (page: number = 1, perPage: number = 50) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC) {
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
    }))
  );

  return animeList;
};

export const getTopMovies = async (page: number = 1, perPage: number = 50) => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, format: MOVIE, sort: SCORE_DESC) {
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
          averageScore
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
      episode: "فیلم",
    }))
  );

  return animeList;
};
