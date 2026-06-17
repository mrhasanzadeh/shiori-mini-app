import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { buildTelegramUserPayload } from "@/utils/telegramUser";
import type { TelegramUserPayload } from "@/services/supabaseUsers";
import { isTelegramMiniApp } from "@/lib/platform";

interface PopupButton {
  type: "default" | "destructive";
  text: string;
  id?: string;
}

export const useTelegramApp = () => {
  const [user, setUser] = useState<TelegramUserPayload | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isTelegramMiniApp()) {
      setIsReady(true);
      setUser(null);
      return;
    }

    const init = async () => {
      try {
        await WebApp.ready();
        setIsReady(true);
        setUser(buildTelegramUserPayload(WebApp.initDataUnsafe.user, WebApp.initData));
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
        (buttonId) => {
          resolve(buttonId || "");
        }
      );
    });
  };

  const openLink = (url: string) => {
    WebApp.openLink(url);
  };

  const shareUrl = (url: string, text?: string) => {
    const shareLink = new URL("https://t.me/share/url");
    shareLink.searchParams.set("url", url);
    if (text?.trim()) shareLink.searchParams.set("text", text.trim());
    WebApp.openTelegramLink(shareLink.toString());
  };

  return {
    user,
    isReady,
    showAlert,
    showConfirm,
    showPopup,
    openLink,
    shareUrl,
  };
};
