import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Menu, ChevronDown, Plus, Sparkles, Globe, Calendar, LogOut } from 'lucide-react';

export const Header = () => {
  const {
    activeFestival,
    festivals,
    switchFestival,
    language,
    toggleLanguage,
    user,
    logout,
    setIsFestivalModalOpen,
    setIsOpeningBalanceModalOpen,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFestDropdownOpen, setIsFestDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#0c0d10]/95 backdrop-blur-md border-b border-[#1f2228] px-4 py-3">
      <div className="max-w-xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Mandal Title */}
          <div className="flex items-center gap-2.5">
            <img
              src="/mandal-logo.jpg"
              alt="ज्योती नवरात्र मंडळ"
              className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/70 shadow-lg shadow-orange-950/40 flex-shrink-0"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#D9381E] items-center justify-center font-bold text-white shadow-lg shadow-orange-950/40 text-base flex-shrink-0 border border-orange-400/30 hidden">
              ज्यो
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-[14.5px] sm:text-[15.5px] text-zinc-100 tracking-tight flex items-center gap-1.5">
                {language === 'mr' ? 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ' : 'Jyoti Navratra Mandal'}
              </h1>
              <p className="text-[12px] text-zinc-400 font-normal">
                {activeFestival?.mandalAddress || '१९३, एम.आय.डी.सी.रोड, सोलापूर'}
              </p>
            </div>
          </div>

          {/* Right badges & controls */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-[#181a1f] border border-[#2b2f38] text-zinc-300 hover:text-white flex items-center gap-1 transition"
              title="Toggle Language / भाषा बदला"
            >
              <Globe size={12} className="text-[#2DD4BF]" />
              <span>{language === 'mr' ? 'ENG' : 'मराठी'}</span>
            </button>

            {/* Menu icon */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-8 h-8 rounded-lg bg-[#181a1f] border border-[#262a33] flex items-center justify-center text-zinc-300 hover:text-white transition relative"
                aria-label="Menu"
              >
                <Menu size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </button>

              {/* Menu Dropdown */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#181a1f] border border-[#2a2e39] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-[#262a33] mb-1">
                    <p className="text-xs text-zinc-400">लॉग इन केले आहे:</p>
                    <p className="text-sm font-semibold text-white">{user?.name} ({user?.role})</p>
                    <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                  </div>

                  {/* Only Admin can create new festival/year */}
                  {user?.role === 'Admin' && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsFestivalModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-[#242731] rounded-xl transition text-left"
                    >
                      <Plus size={15} className="text-[#FF5A1F]" />
                      <span>{language === 'mr' ? 'नवीन उत्सव / वर्ष जोडा (Admin)' : 'Add New Festival (Admin)'}</span>
                    </button>
                  )}

                  {/* Admin or Treasurer can set opening balance */}
                  {(user?.role === 'Admin' || user?.role === 'Treasurer') && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsOpeningBalanceModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-[#242731] rounded-xl transition text-left"
                    >
                      <Calendar size={15} className="text-[#2DD4BF]" />
                      <span>{language === 'mr' ? 'मागील वर्षाची शिल्लक (Opening Balance)' : 'Set Opening Balance'}</span>
                    </button>
                  )}

                  <div className="border-t border-[#262a33] my-1" />

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/40 rounded-xl transition text-left"
                  >
                    <LogOut size={15} className="text-red-400" />
                    <span>{language === 'mr' ? 'सुरक्षित लॉगआउट (Logout)' : 'Logout'}</span>
                  </button>

                  <div className="border-t border-[#262a33] my-1" />
                  <div className="px-3 py-1 text-[11px] text-zinc-500">
                    रजि. नं: {activeFestival?.registrationNo || 'महा./६१३/सोलापूर'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Greeting line */}
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[13px] text-zinc-300 font-medium">
              {language === 'mr' ? `नमस्कार, ${user?.name || 'कार्यकर्ते'}` : `Namaskar, ${user?.name || 'Worker'}`}
            </p>
            {user?.role && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                user.role === 'Admin'
                  ? 'bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/40'
                  : user.role === 'Treasurer'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}>
                {user.role === 'Admin' ? '👑 Admin' : user.role === 'Treasurer' ? '💰 Treasurer' : '🙋 Volunteer'}
              </span>
            )}
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1 text-[11px] font-bold text-red-400/80 hover:text-red-300 transition px-2 py-0.5 rounded-lg hover:bg-red-950/30"
            title="Logout / लॉगआउट"
          >
            <LogOut size={12} />
            <span>लॉगआउट</span>
          </button>
        </div>
      </div>
    </header>
  );
};
