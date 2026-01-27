import React from 'react';
import { Outlet } from 'react-router-dom';

const AdminLayout = ({ children }) => {
    return (
        <div className="flex h-full w-full overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
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
