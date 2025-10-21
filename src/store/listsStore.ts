import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ListItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface List {
  id: string;
  title: string;
  items: ListItem[];
  createdAt: string;
}

interface ListsState {
  lists: List[];
  addList: (title: string) => void;
  removeList: (listId: string) => void;
  addItem: (listId: string, text: string) => void;
  removeItem: (listId: string, itemId: string) => void;
  toggleItemCompleted: (listId: string, itemId: string) => void;
}

export const useListsStore = create<ListsState>()(
  persist(
    (set) => ({
      lists: [],
      addList: (title) =>
        set((state) => ({
          lists: [
            ...state.lists,
            {
              id: Date.now().toString(),
              title,
              items: [],
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removeList: (listId) =>
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== listId),
        })),
      addItem: (listId, text) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: [
                    ...list.items,
                    {
                      id: Date.now().toString(),
                      text,
                      completed: false,
                    },
                  ],
                }
              : list
          ),
        })),
      removeItem: (listId, itemId) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: list.items.filter((item) => item.id !== itemId),
                }
              : list
          ),
        })),
      toggleItemCompleted: (listId, itemId) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  items: list.items.map((item) =>
                    item.id === itemId
                      ? { ...item, completed: !item.completed }
                      : item
                  ),
                }
              : list
          ),
        })),
    }),
    {
      name: "lists-storage",
    }
  )
);
