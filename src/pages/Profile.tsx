import { useState, useEffect } from 'react'
import { UserIcon, CogIcon } from '@heroicons/react/24/outline'
import WebApp from '@twa-dev/sdk'

const Profile = () => {
  const [userName, setUserName] = useState('کاربر')
  const [initials, setInitials] = useState('ک')
  
  useEffect(() => {
    // دریافت اطلاعات کاربر از تلگرام (اگر موجود باشد)
    if (WebApp.initDataUnsafe?.user) {
      const user = WebApp.initDataUnsafe.user
      const name = user.first_name || 'کاربر'
      setUserName(name)
      setInitials(name.charAt(0))
    }
  }, [])
  
  return (
    <div className="pb-24">
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-semibold">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-100">
              {userName}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              خوش آمدید به شیوری
            </p>
          </div>
        </div>
      </div>
      
      {/* منوی تنظیمات */}
      <div className="px-4 mt-4">
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center gap-3">
            <CogIcon className="w-6 h-6 text-gray-400" />
            <span className="text-gray-200">تنظیمات</span>
          </div>
          
          <div className="p-4 flex justify-between items-center">
            <span className="text-gray-300">حالت تاریک</span>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked={true} />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
          
          <div className="p-4 flex justify-between items-center border-t border-gray-700">
            <span className="text-gray-300">اعلان‌ها</span>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked={true} />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </div>
        
        {/* اطلاعات برنامه */}
        <div className="bg-gray-800 rounded-xl overflow-hidden mt-4">
          <div className="p-4 border-b border-gray-700 flex items-center gap-3">
            <UserIcon className="w-6 h-6 text-gray-400" />
            <span className="text-gray-200">درباره شیوری</span>
          </div>
          
          <div className="p-4">
            <p className="text-gray-400 text-sm leading-relaxed">
              شیوری یک مینی اپلیکیشن تلگرامی برای مدیریت و دنبال کردن انیمه‌های مورد علاقه شماست. با شیوری می‌توانید لیست انیمه‌های مورد علاقه خود را مدیریت کنید و برنامه پخش هفتگی آن‌ها را ببینید.
            </p>
            <p className="text-gray-500 text-xs mt-4">
              نسخه ۱.۰.۰
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile 