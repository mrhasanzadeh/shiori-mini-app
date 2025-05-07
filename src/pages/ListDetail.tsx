import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useListsStore } from './MyList'

const ListDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lists, addItem, removeItem, removeList, toggleItemCompleted } = useListsStore()
  const [newItemText, setNewItemText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const list = lists.find(list => list.id === id)
  
  useEffect(() => {
    if (!list) {
      navigate('/my-list')
    }
  }, [list, navigate])
  
  if (!list) {
    return null
  }
  
  const handleAddItem = () => {
    if (newItemText.trim()) {
      addItem(list.id, newItemText.trim())
      setNewItemText('')
    }
  }
  
  const handleDeleteList = () => {
    removeList(list.id)
    navigate('/lists')
  }
  
  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate('/my-list')}
            className="p-2 rounded-full hover:bg-white/10 text-white"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-slate-100">{list.title}</h1>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="افزودن مورد جدید..."
              className="flex-1 bg-slate-700 text-slate-100 rounded-lg px-4 py-3 border border-slate-600 focus:border-primary-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <button
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
              className="bg-primary-500 hover:bg-primary-600 disabled:bg-slate-700 disabled:text-slate-500 text-white p-3 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {list.items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">هنوز موردی به این لیست اضافه نشده است</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.items.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between bg-slate-800 rounded-xl p-4 border border-slate-700"
              >
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleItemCompleted(list.id, item.id)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                      item.completed 
                        ? 'border-green-500 bg-green-500/20 text-green-500' 
                        : 'border-slate-500 text-transparent'
                    }`}
                  >
                    {item.completed && <CheckCircleIcon className="w-5 h-5" />}
                  </button>
                  <p className={`text-slate-100 ${item.completed ? 'line-through text-slate-500' : ''}`}>
                    {item.text}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(list.id, item.id)}
                  className="p-2 text-slate-400 hover:text-red-500"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 hover:text-red-400 text-sm"
          >
            حذف این لیست
          </button>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-5 w-full max-w-sm">
            <h3 className="text-lg font-medium text-slate-100 mb-2">حذف لیست</h3>
            <p className="text-slate-400 mb-4">
              آیا مطمئن هستید که می‌خواهید این لیست را حذف کنید؟ این عمل قابل بازگشت نیست.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                انصراف
              </button>
              <button
                onClick={handleDeleteList}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ListDetail 