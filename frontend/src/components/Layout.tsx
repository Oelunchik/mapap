import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../pages/AuthContext';

const NAV = [
  { to: '/',         icon: '📊', label: 'Дашборд' },
  { to: '/tasks',    icon: '📋', label: 'Задачи' },
  { to: '/kanban',   icon: '🗂', label: 'Канбан' },
  { to: '/tracks',   icon: '🌐', label: 'Международные треки' },
  { to: '/reports',  icon: '📈', label: 'Отчёты' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-blue-900 text-white flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-blue-800">
          <div className="text-lg font-bold tracking-tight">MAPAP</div>
          <div className="text-xs text-blue-300 mt-0.5">Проектный офис транспорта РК</div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white font-medium'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-blue-800">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              {user?.full_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name}</div>
              <div className="text-xs text-blue-300 truncate">
                {user?.role === 'head' ? 'Руководитель' : 'Аналитик'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors">
            Выйти
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
