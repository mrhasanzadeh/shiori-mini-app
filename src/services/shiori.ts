// Local mock service to replace AniList during development
// Shapes are compatible with existing UI usage

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

const mockImage = "/assets/images/frieren-03.webp";

const baseAnime: AnimeDetails = {
  id: 1,
  title: "Frieren: Beyond Journey's End",
  image: mockImage,
  description:
    "شرح آزمایشی برای نمایش جایگذاری متن کارت. این متن صرفاً نمایشی است.",
  status: "RELEASING",
  genres: ["فانتزی", "ماجراجویی", "درام"],
  episodes: Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    number: i + 1,
    title: `قسمت ${i + 1}`,
  })),
  studios: ["MADHOUSE"],
  producers: ["Aniplex"],
  season: "پاییز ۱۴۰۳",
  startDate: "۱۴۰۳/۰۷/۰۱",
  endDate: "",
};

const cards: AnimeCard[] = [
  {
    id: 1,
    title: baseAnime.title,
    image: baseAnime.image,
    description: baseAnime.description,
    status: baseAnime.status,
    genres: baseAnime.genres,
    episodes: baseAnime.episodes.length,
    isNew: true,
    episode: "قسمت ۱",
    averageScore: 88,
  },
  {
    id: 2,
    title: "Sousou no Frieren S2",
    image: baseAnime.image,
    description: baseAnime.description,
    status: "FINISHED",
    genres: ["اکشن", "فانتزی"],
    episodes: 24,
    isNew: false,
    episode: "قسمت ۲۴",
    averageScore: 90,
  },
  {
    id: 3,
    title: "Made in Abyss Movie",
    image: baseAnime.image,
    description: baseAnime.description,
    status: "FINISHED",
    genres: ["ماجراجویی", "درام"],
    episodes: 1,
    isNew: false,
    episode: "فیلم",
    averageScore: 82,
  },
];

export const getLatestAnime = async () => {
  return cards;
};

export const getPopularAnime = async () => {
  return cards;
};

export const getNewEpisodes = async () => {
  return cards.map((c) => ({ ...c, isNew: true, episode: c.episode || "قسمت ۱" }));
};

export const getAnimeMovies = async () => {
  return cards.filter((c) => (c.episode || "").includes("فیلم"));
};

export const getAnimeById = async (id: number): Promise<AnimeDetails> => {
  if (id === 1) return baseAnime;
  return {
    ...baseAnime,
    id,
    title: `نمونه ${id}`,
  };
};

export const getSimilarAnime = async (_id: number) => {
  return cards.map((c) => ({
    id: c.id + 100,
    title: `${c.title} مشابه`,
    image: c.image,
    status: c.status,
    genres: c.genres,
    score: c.averageScore,
  }));
};

export const getSchedule = async () => {
  const schedule = {
    شنبه: [
      { id: 1, title: cards[0].title, time: "۲۰:۳۰", episode: "قسمت ۱", image: cards[0].image },
    ],
    یکشنبه: [],
    دوشنبه: [
      { id: 2, title: cards[1].title, time: "۱۸:۱۵", episode: "قسمت ۲۴", image: cards[1].image },
    ],
    سه‌شنبه: [],
    چهارشنبه: [],
    پنج‌شنبه: [
      { id: 3, title: cards[2].title, time: "۲۱:۰۰", episode: "فیلم", image: cards[2].image },
    ],
    جمعه: [],
  } as Record<string, Array<{ id: number; title: string; time: string; episode: string; image: string }>>;

  const currentDate = new Date();
  const currentSeason = "پاییز";
  const currentYear = currentDate.getFullYear();

  return { schedule, currentSeason, currentYear };
};

export const searchAnime = async (search: string) => {
  const term = search.trim().toLowerCase();
  if (!term) return [] as AnimeCard[];
  return cards.filter((c) => c.title.toLowerCase().includes(term));
};


