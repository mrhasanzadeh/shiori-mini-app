// Mock API functions for demonstration
// In a real application, these would be replaced with actual API calls

export const fetchAnimeList = async () => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      id: 1,
      title: "وان پیس",
      image: "https://via.placeholder.com/300x400",
      description:
        "داستان ماجراجویی مونکی دی. لافی و گروه دزدان دریایی کلاه حصیری در جستجوی گنج بزرگ وان پیس.",
      status: "در حال پخش",
      genres: ["ماجراجویی", "کمدی", "فانتزی"],
      episodes: [
        { id: 1, number: 1050, title: "قسمت ۱۰۵۰" },
        { id: 2, number: 1049, title: "قسمت ۱۰۴۹" },
      ],
    },
    {
      id: 2,
      title: "اتک آن تایتان",
      image: "https://via.placeholder.com/300x400",
      description: "داستان انسان‌ها در مبارزه با تایتان‌ها برای بقا.",
      status: "پایان یافته",
      genres: ["اکشن", "درام", "فانتزی"],
      episodes: [
        { id: 3, number: 25, title: "قسمت ۲۵" },
        { id: 4, number: 24, title: "قسمت ۲۴" },
      ],
    },
  ];
};

export const fetchAnimeById = async (id: number) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const animeList = await fetchAnimeList();
  const anime = animeList.find((a) => a.id === id);

  if (!anime) {
    throw new Error("Anime not found");
  }

  return anime;
};

export const fetchSchedule = async () => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    شنبه: [
      { id: 1, title: "وان پیس", time: "۱۸:۰۰", episode: "قسمت ۱۰۵۰" },
      { id: 2, title: "اتک آن تایتان", time: "۱۹:۳۰", episode: "قسمت ۲۵" },
    ],
    یکشنبه: [{ id: 3, title: "جوجوتسو کایزن", time: "۲۰:۰۰", episode: "قسمت ۱۲" }],
    دوشنبه: [{ id: 4, title: "دیمون اسلیر", time: "۲۱:۰۰", episode: "قسمت ۸" }],
    سه‌شنبه: [{ id: 5, title: "مای هیرو آکادمیا", time: "۱۹:۰۰", episode: "قسمت ۱۵" }],
    چهارشنبه: [{ id: 6, title: "بلک کلاور", time: "۱۸:۳۰", episode: "قسمت ۲۰" }],
    پنج‌شنبه: [{ id: 7, title: "دراگون بال", time: "۲۰:۳۰", episode: "قسمت ۱۰" }],
    جمعه: [{ id: 8, title: "ناروتو", time: "۱۹:۰۰", episode: "قسمت ۵۰" }],
  };
};
