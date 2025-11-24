import React, { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Batches', href: '/batches', icon: '📚' },
    { name: 'Students', href: '/students', icon: '👥' },
    { name: 'Faculty', href: '/faculty', icon: '👨‍🏫' },
    { name: 'Employees', href: '/employees', icon: '💼' },
    { name: 'Attendance', href: '/attendance', icon: '✅' },
    ...(user?.role !== 'student' ? [{ name: 'My Attendance', href: '/student-attendance', icon: '📸' }] : []),
    { name: 'Payments', href: '/payments', icon: '💰' },
    { name: 'Portfolios', href: '/portfolios', icon: '📁' },
    { name: 'Reports', href: '/reports', icon: '📊' },
    { name: 'Approvals', href: '/approvals', icon: '✓' },
    { name: 'Leave Management', href: '/leaves', icon: '🏖️' },
    { name: 'Batch Extensions', href: '/batch-extensions', icon: '⏱️' },
    { name: 'Users', href: '/users', icon: '👤' },
    ...(user?.role === 'superadmin' ? [{ name: 'Roles', href: '/roles', icon: '🔐' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow-lg transition-all duration-300 ease-in-out fixed h-screen overflow-y-auto z-50`}
      >
        <div className="p-4">
          {/* Logo and Toggle */}
          <div className="flex items-center justify-between mb-8">
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-orange-600">Prime Academy</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {sidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2 pb-24">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-orange-100 text-orange-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={!sidebarOpen ? item.name : ''}
                >
                  <span className="text-xl mr-3 flex-shrink-0">{item.icon}</span>
                  {sidebarOpen && (
                    <span className="text-sm whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info at Bottom */}
        {sidebarOpen && user && (
          <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white mt-auto">
            <div className="text-sm text-gray-600 mb-2">
              <div className="font-semibold text-gray-900 truncate">{user.name}</div>
              <div className="text-xs text-gray-500">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 min-h-screen`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors mr-4"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              )}
              <h2 className="text-xl font-semibold text-gray-800">
                {navigation.find(item => location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href)))?.name || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              {!sidebarOpen && user && (
                <>
                  <span className="text-sm text-gray-700">
                    {user.name} ({user.role})
                  </span>
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 bg-gray-50 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
};
