import React from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './pages/admin/AdminSidebar'

const AdminLayout: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-sky-50 lg:flex-row">
    {/* Sidebar — cachée sur mobile, affichée via menu si besoin */}
    <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r shadow-sm">
      <AdminSidebar children={undefined} />
    </aside>

    {/* Contenu principal */}
    <main className="flex-1 overflow-x-hidden overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <Outlet />
      </div>
    </main>
  </div>
)

export default AdminLayout
