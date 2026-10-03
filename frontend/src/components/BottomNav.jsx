import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Receipt, Users, Wallet, BarChart3 } from 'lucide-react';

export const BottomNav = () => {
  const { currentTab, setCurrentTab, language } = useApp();

  const navItems = [
    {
      id: 'home',
      label: language === 'mr' ? 'Home' : 'Home',
      icon: Home,
    },
    {
      id: 'receipt',
      label: language === 'mr' ? 'Receipt' : 'Receipt',
      icon: Receipt,
    },
    {
      id: 'workers',
      label: language === 'mr' ? 'Workers' : 'Workers',
      icon: Users,
    },
    {
      id: 'expense',
      label: language === 'mr' ? 'Expense' : 'Expense',
      icon: Wallet,
    },
    {
      id: 'reports',
      label: language === 'mr' ? 'Reports' : 'Reports',
      icon: BarChart3,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#121316]/95 backdrop-blur-md border-t border-[#1e2026] py-2 px-3">
      <div className="max-w-xl mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition duration-150 relative ${
                isActive ? 'text-[#FF5A1F]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 w-8 h-1 rounded-full bg-[#FF5A1F]" />
              )}
              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? 'bg-[#FF5A1F]/15' : 'bg-transparent'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span className={`text-[11px] font-medium tracking-tight mt-0.5 ${isActive ? 'font-semibold text-[#FF5A1F]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
