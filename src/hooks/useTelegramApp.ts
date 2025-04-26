import { useEffect, useState } from "react";
import { WebApp } from "@twa-dev/sdk";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export const useTelegramApp = () => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await WebApp.ready();
        setIsReady(true);
        setUser(WebApp.initDataUnsafe.user || null);
      } catch (error) {
        console.error("Failed to initialize Telegram Web App:", error);
      }
    };

    init();
  }, []);

  const showAlert = (message: string) => {
    WebApp.showAlert(message);
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      WebApp.showConfirm(message, (confirmed) => {
        resolve(confirmed);
      });
    });
  };

  const showPopup = (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id: string;
      type?: "default" | "ok" | "close" | "cancel" | "destructive";
      text: string;
    }>;
  }) => {
    return new Promise<string>((resolve) => {
      WebApp.showPopup(params, (buttonId) => {
        resolve(buttonId);
      });
    });
  };

  return {
    user,
    isReady,
    showAlert,
    showConfirm,
    showPopup,
  };
};
