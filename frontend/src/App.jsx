import React from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './views/DashboardView';
import { ReceiptsView } from './views/ReceiptsView';
import { DonorsAndWorkersView } from './views/DonorsAndWorkersView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsView } from './views/ReportsView';

import { NewPaymentModal } from './components/modals/NewPaymentModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { AddDonorModal } from './components/modals/AddDonorModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { AddFestivalModal } from './components/modals/AddFestivalModal';
import { OpeningBalanceModal } from './components/modals/OpeningBalanceModal';
import { LoginView } from './views/LoginView';

export default function App() {
  const { currentTab, toast, user, loading } = useApp();

  // Show sleek loader while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0d10] text-[#eaeaea] flex flex-col items-center justify-center font-sans">
        <div className="relative mb-4">
          <div className="w-12 h-12 border-3 border-[#262933] border-t-[#FF5A1F] rounded-full animate-spin" />
        </div>
        <p className="text-xs font-semibold text-zinc-400 tracking-wide animate-pulse">
          सुरक्षित सत्र तपासत आहे...
        </p>
      </div>
    );
  }

  // If user is not logged in, enforce LoginView
  if (!user) {
    return (
      <>
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
            <div
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border ${
                toast.type === 'error'
                  ? 'bg-red-950/90 text-red-200 border-red-700/60'
                  : 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  toast.type === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                }`}
              />
              <span>{toast.message}</span>
            </div>
          </div>
        )}
        <LoginView />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#eaeaea] flex flex-col font-sans selection:bg-[#FF5A1F] selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border ${
              toast.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-700/60'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                toast.type === 'error' ? 'bg-red-400' : 'bg-emerald-400'
              }`}
            />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header />

      {/* Main App Content Viewport (Mobile First Container) */}
      <main className="flex-1 w-full max-w-xl mx-auto px-3.5 sm:px-4">
        <div className={currentTab === 'home' ? 'block' : 'hidden'}>
          <DashboardView />
        </div>
        <div className={currentTab === 'receipt' ? 'block' : 'hidden'}>
          <ReceiptsView />
        </div>
        <div className={currentTab === 'workers' ? 'block' : 'hidden'}>
          <DonorsAndWorkersView />
        </div>
        <div className={currentTab === 'expense' ? 'block' : 'hidden'}>
          <ExpensesView />
        </div>
        <div className={currentTab === 'reports' ? 'block' : 'hidden'}>
          <ReportsView />
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* All Application Modals */}
      <NewPaymentModal />
      <ReceiptModal />
      <AddDonorModal />
      <AddExpenseModal />
      <AddFestivalModal />
      <OpeningBalanceModal />
    </div>
  );
}
