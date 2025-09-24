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
      <div className="flex items-center justify-center px-4 pt-6 pb-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-24 h-24 rounded-2xl border-2 border-white/10 border-b-white/5 bg-primary-500 flex items-center justify-center text-white text-2xl font-semibold">
            {initials}
          </div>
            <h1 className="text-xl font-semibold text-gray-100">
              {userName}
            </h1>
        </div>
      </div>
      
      {/* منوی تنظیمات */}
      <div className="px-4 mt-4">
        <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
          <Link 
            to="/notifications" 
            className="p-4 flex justify-between items-center hover:bg-gray-700/50 transition-colors"
          >
            <div className="w-full flex justify-between items-center gap-2">
              <span className="text-gray-300">اعلان‌ها</span>
              {hasNewNotifications && (
                <span className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-lg">
                  ۱۲
                </span>
              )}
            </div>
          </Link>
        </div>
        
        {/* اطلاعات برنامه */}
        <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden mt-4">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3">
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