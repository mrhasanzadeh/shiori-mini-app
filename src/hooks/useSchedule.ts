import { useState, useEffect } from "react";
import { fetchSchedule } from "../utils/api";

interface ScheduleItem {
  id: number;
  title: string;
  time: string;
  episode: string;
}

interface Schedule {
  [key: string]: ScheduleItem[];
}

export const useSchedule = () => {
  const [schedule, setSchedule] = useState<Schedule>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(() => {
    const today = new Date().toLocaleDateString("fa-IR", { weekday: "long" });
    return today;
  });

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSchedule();
      setSchedule(data);
    } catch (err) {
      setError("خطا در بارگذاری برنامه پخش");
      console.error("Failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDaySchedule = (day: string) => {
    return schedule[day] || [];
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  return {
    schedule,
    loading,
    error,
    activeDay,
    setActiveDay,
    getDaySchedule,
    loadSchedule,
  };
};
