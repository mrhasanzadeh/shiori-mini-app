import { Link } from 'react-router-dom'

const AdminDashboard = () => {
  return (
    <div>
      <h1 className="text-foreground text-xl font-bold">پنل ادمین</h1>
      <p className="text-muted-foreground text-sm mt-2">مدیریت دیتابیس و محتوا</p>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <Link
          to="/admin/anime"
          className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="text-sm font-semibold">انیمه‌ها</div>
          <div className="text-xs text-muted-foreground mt-1">لیست / ایجاد / ویرایش</div>
        </Link>

        <Link
          to="/admin/genres"
          className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="text-sm font-semibold">ژانرها</div>
          <div className="text-xs text-muted-foreground mt-1">لیست / افزودن / ویرایش</div>
        </Link>

        <Link
          to="/admin/studios"
          className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="text-sm font-semibold">استودیوها</div>
          <div className="text-xs text-muted-foreground mt-1">لیست / افزودن / ویرایش</div>
        </Link>

        <Link
          to="/admin/translators"
          className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="text-sm font-semibold">مترجم‌ها</div>
          <div className="text-xs text-muted-foreground mt-1">لیست / افزودن / ویرایش</div>
        </Link>

        <Link
          to="/admin/files-downloads"
          className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="text-sm font-semibold">دانلود فایل‌ها</div>
          <div className="text-xs text-muted-foreground mt-1">آمار / جستجو / صفحه‌بندی</div>
        </Link>

        <Link
          to="/admin/file-packs"
          className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="text-sm font-semibold">پک فایل‌ها</div>
          <div className="text-xs text-muted-foreground mt-1">ساخت / مدیریت / لینک یک‌کلیک</div>
        </Link>

        <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
          <div className="text-sm font-semibold">کاربران</div>
          <div className="text-xs mt-1">به‌زودی</div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
