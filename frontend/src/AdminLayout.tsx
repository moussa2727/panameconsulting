import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './pages/admin/AdminSidebar';

const AdminLayout: React.FC = () => (
  <div className='bg-sky-50 flex flex-col lg:flex-row'>
    <AdminSidebar children={undefined} />
    <main className='flex-1 overflow-x-hidden overflow-y-auto'>
      <div className='container mx-auto px-4 py-6 lg:py-8 lg:px-6'>
        <Outlet />
      </div>
    </main>
  </div>
);

export default AdminLayout;