import { Link } from 'react-router-dom'

const AdminDashboard = () => {
  return (
    <div>
      <h1 className="text-white text-xl font-bold">پنل ادمین</h1>
      <p className="text-gray-400 text-sm mt-2">مدیریت دیتابیس و محتوا</p>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <Link
          to="/admin/anime"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white"
        >
          <div className="text-sm font-semibold">انیمه‌ها</div>
          <div className="text-xs text-gray-400 mt-1">لیست / ایجاد / ویرایش</div>
        </Link>

        <Link
          to="/admin/genres"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white"
        >
          <div className="text-sm font-semibold">ژانرها</div>
          <div className="text-xs text-gray-400 mt-1">لیست / افزودن / ویرایش</div>
        </Link>

        <Link
          to="/admin/studios"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white"
        >
          <div className="text-sm font-semibold">استودیوها</div>
          <div className="text-xs text-gray-400 mt-1">لیست / افزودن / ویرایش</div>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-gray-500">
          <div className="text-sm font-semibold">کاربران</div>
          <div className="text-xs mt-1">به‌زودی</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-gray-500">
          <div className="text-sm font-semibold">تنظیمات</div>
          <div className="text-xs mt-1">به‌زودی</div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
