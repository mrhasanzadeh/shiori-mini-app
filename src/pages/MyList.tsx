import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAnimeStore } from '../store/animeStore'
import { PlusIcon, HeartIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid, ListBulletIcon as ListBulletIconSolid } from '@heroicons/react/24/solid'
import { Anime } from '../store/cacheStore'
import { getAnimeById } from '../services/anilist'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// تعریف انواع داده برای لیست‌ها
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

// استور برای مدیریت لیست‌ها
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

type TabType = 'favorites' | 'lists';

const MyList = () => {
  const [activeTab, setActiveTab] = useState<TabType>('favorites')
  const navigate = useNavigate()
  
  // State for Favorites tab
  const { favoriteAnime } = useAnimeStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [favoriteAnimeDetails, setFavoriteAnimeDetails] = useState<Anime[]>([])
  
  // State for Lists tab
  const { lists, addList } = useListsStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  
  // Handle creating a new list
  const handleCreateList = () => {
    if (newListTitle.trim()) {
      addList(newListTitle.trim())
      setNewListTitle('')
      setShowCreateModal(false)
    }
  }
  
  useEffect(() => {
    if (activeTab === 'favorites') {
      loadFavoriteAnime()
    }
  }, [favoriteAnime, activeTab])
  
  const loadFavoriteAnime = async () => {
    if (favoriteAnime.length === 0) {
      setFavoriteAnimeDetails([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const animeDetails = await Promise.all(
        favoriteAnime.map(async (id) => {
          const details = await getAnimeById(id)
          return {
            id: details.id,
            title: details.title,
            image: details.image,
            episode: `قسمت ${details.episodes.length > 0 ? details.episodes.length : '۱'}`,
            genres: details.genres,
            description: details.description
          } as Anime
        })
      )
      
      setFavoriteAnimeDetails(animeDetails)
    } catch (err) {
      setError('خطا در بارگذاری لیست مورد علاقه')
      console.error('Failed to load favorite anime:', err)
    } finally {
      setLoading(false)
    }
  }

  // Common loading state
  if (loading && activeTab === 'favorites') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Common error state
  if (error && activeTab === 'favorites') {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Tabs Header */}
      <div className="bg-black shadow">
        <div className="container flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm ${
              activeTab === 'favorites' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-gray-400'
            }`}
          >
            <HeartIcon className="w-5 h-5" />
            <span>علاقه‌مندی‌ها</span>
          </button>
          <button
            onClick={() => setActiveTab('lists')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm ${
              activeTab === 'lists' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-gray-400'
            }`}
          >
            <ListBulletIcon className="w-5 h-5" />
            <span>لیست‌ها</span>
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="mt-4">
        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <>
            {/* Empty state for favorites */}
            {favoriteAnime.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[70vh] px-4">
                <HeartIconSolid className="w-16 h-16 text-gray-700 mb-4" />
                <h2 className="text-xl font-medium text-gray-300 mb-2">لیست مورد علاقه شما خالی است</h2>
                <p className="text-gray-500 text-center mb-8">انیمه‌های مورد علاقه خود را با زدن روی دکمه قلب اضافه کنید</p>
                <Link 
                  to="/" 
                  className="flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors duration-200"
                >
                  <PlusIcon className="w-5 h-5" />
                  مرور انیمه‌ها
                </Link>
              </div>
            ) : (
              <div>
                <div className="px-4 pt-4 pb-6">
                  <h1 className="text-xl font-semibold text-gray-100">لیست مورد علاقه</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {favoriteAnimeDetails.length} انیمه در لیست شما
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4">
                  {favoriteAnimeDetails.map((anime) => (
                    <Link
                      key={anime.id}
                      to={`/anime/${anime.id}`}
                      className="block relative"
                      aria-label={`مشاهده ${anime.title}`}
                    >
                      <div className="card">
                        <div className="relative aspect-[2/3] overflow-hidden">
                          <img
                            src={anime.image}
                            alt={anime.title}
                            className="w-full h-full object-cover absolute inset-0"
                            loading="lazy"
                          />
                          <div className="absolute top-2 right-2">
                            <HeartIconSolid className="w-6 h-6 text-primary-500 drop-shadow-lg" />
                          </div>
                        </div>
                        <div className="mt-3">
                          <h3 className="text-sm font-medium line-clamp-1 text-gray-100">
                            {anime.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-[2px]">
                            {anime.episode}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Lists Tab */}
        {activeTab === 'lists' && (
          <>
            {/* Empty state for lists */}
            {lists.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[70vh] px-4">
                <ListBulletIconSolid className="w-16 h-16 text-gray-700 mb-4" />
                <h2 className="text-xl font-medium text-gray-300 mb-2">لیست‌های شما خالی است</h2>
                <p className="text-gray-500 text-center mb-8">لیست‌های خود را برای مدیریت بهتر کارها ایجاد کنید</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors duration-200"
                >
                  <PlusIcon className="w-5 h-5" />
                  ایجاد لیست جدید
                </button>
              </div>
            ) : (
              <div>
                <div className="px-4 pt-4 pb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-gray-100">لیست‌های من</h1>
                    <p className="text-gray-400 text-sm mt-1">
                      {lists.length} لیست
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-1 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    جدید
                  </button>
                </div>

                <div className="px-4 space-y-4">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => navigate(`/lists/${list.id}`)}
                      className="bg-gray-800 rounded-xl p-4 shadow-md border border-gray-700 cursor-pointer active:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-100 font-medium text-lg">{list.title}</h3>
                        <span className="text-gray-400 text-xs">
                          {list.items.length} مورد
                        </span>
                      </div>
                      
                      {list.items.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          {list.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${item.completed ? 'bg-green-500' : 'bg-gray-500'}`} />
                              <p className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                {item.text}
                              </p>
                            </div>
                          ))}
                          {list.items.length > 3 && (
                            <p className="text-gray-500 text-xs mt-1">
                              و {list.items.length - 3} مورد دیگر...
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm mt-2">
                          لیست خالی است
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create List Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl p-5 w-full max-w-sm">
                  <h3 className="text-lg font-medium text-gray-100 mb-4">ایجاد لیست جدید</h3>
                  <input
                    type="text"
                    placeholder="عنوان لیست"
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    className="w-full bg-gray-700 text-gray-100 rounded-lg px-4 py-3 mb-4 border border-gray-600 focus:border-primary-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-gray-300 hover:text-white"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleCreateList}
                      className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      ایجاد
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MyList 