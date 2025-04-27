import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface PopupButton {
  type: "default" | "destructive";
  text: string;
  id?: string;
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
      WebApp.showConfirm(message, (confirmed: boolean) => {
        resolve(confirmed);
      });
    });
  };

  const showPopup = (params: { title?: string; message: string; buttons?: PopupButton[] }) => {
    return new Promise<string>((resolve) => {
      WebApp.showPopup(
        {
          ...params,
          buttons: params.buttons?.map((button) => ({
            ...button,
            type: button.type || "default",
          })),
        },
        (buttonId: string) => {
          resolve(buttonId);
        }
      );
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
