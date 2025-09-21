import { useState, useEffect } from 'react'
import { UserIcon, Settings01Icon, AlarmClockIcon } from 'hugeicons-react'
import { Link } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'

const Profile = () => {
  const [userName, setUserName] = useState('کاربر')
  const [initials, setInitials] = useState('ک')
  const hasNewNotifications = true // این مقدار باید از API گرفته شود
  
  useEffect(() => {
    // دریافت اطلاعات کاربر از تلگرام
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
        <div className="bg-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3">
            <Settings01Icon className="w-6 h-6 text-gray-400" />
            <span className="text-gray-200">تنظیمات</span>
          </div>
          
          <Link 
            to="/notifications" 
            className="p-4 flex justify-between items-center hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlarmClockIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-300">اعلان‌ها</span>
              {hasNewNotifications && (
                <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                  جدید
                </span>
              )}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
        
        {/* اطلاعات برنامه */}
        <div className="bg-white/10 rounded-xl overflow-hidden mt-4">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3">
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