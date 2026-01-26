import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Admin Sidebar */}
            <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Page Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-[1400px] mx-auto w-full h-full">
                        {children || <Outlet />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
