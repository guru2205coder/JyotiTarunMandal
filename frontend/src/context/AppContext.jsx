import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [festivals, setFestivals] = useState([]);
  const [activeFestival, setActiveFestival] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('mr'); // 'mr' or 'en'
  const [toast, setToast] = useState(null);

  // Active view tab: 'home' | 'receipt' | 'workers' | 'expense' | 'reports'
  const [currentTab, setCurrentTab] = useState('home');
  const [reportSubTab, setReportSubTab] = useState('overview'); // 'overview' | 'pending' | 'statement' | 'ledger'
  const [selectedReportBook, setSelectedReportBook] = useState('all');

  const openPendingDonors = (bookNo = 'all') => {
    setSelectedReportBook(bookNo);
    setReportSubTab('pending');
    setCurrentTab('reports');
  };

  const openBookReport = (bookNo = '1') => {
    setSelectedReportBook(bookNo);
    setReportSubTab('book');
    setCurrentTab('reports');
  };

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDonorForPayment, setSelectedDonorForPayment] = useState(null);

  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [isFestivalModalOpen, setIsFestivalModalOpen] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);

  // Secure User Session State (Stored in localStorage with JWT token)
  const [token, setToken] = useState(() => localStorage.getItem('vargani_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vargani_user');
      const savedToken = localStorage.getItem('vargani_token');
      return saved && savedToken ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const login = async (identifier, password) => {
    try {
      const data = await api.post('/users/login', { identifier, password });
      localStorage.setItem('vargani_token', data.token);
      localStorage.setItem('vargani_user', JSON.stringify(data));
      setToken(data.token);
      setUser(data);
      showToast(language === 'mr' ? `स्वागत आहे, ${data.name}! लॉगिन यशस्वी.` : `Welcome, ${data.name}! Login successful.`);
      try {
        await refreshAll();
      } catch (e) {
        console.error('Error refreshing post-login:', e);
      }
      return { success: true, user: data };
    } catch (err) {
      showToast(err.message || 'लॉगिन अयशस्वी (Login failed)', 'error');
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('vargani_token');
    localStorage.removeItem('vargani_user');
    setToken(null);
    setUser(null);
    showToast(language === 'mr' ? 'सुरक्षित लॉगआउट झाले' : 'Logged out successfully');
  };

  const loadFestivals = async () => {
    try {
      const list = await api.get('/festivals');
      setFestivals(list);
      const active = list.find((f) => f.isActive) || list[0];
      if (active) setActiveFestival(active);
      return active;
    } catch (err) {
      console.error('Error loading festivals:', err);
      return null;
    }
  };

  const loadDashboardStats = useCallback(async (festId) => {
    try {
      const query = festId ? `?festivalId=${festId}` : '';
      const stats = await api.get(`/dashboard/stats${query}`);
      setDashboardStats(stats);
      if (stats.festival) {
        setActiveFestival(stats.festival);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const curToken = localStorage.getItem('vargani_token');
    if (!curToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const active = await loadFestivals();
      if (active) {
        await loadDashboardStats(active._id);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardStats]);

  // Validate session on load
  useEffect(() => {
    const curToken = localStorage.getItem('vargani_token');
    if (curToken) {
      api.get('/users/me')
        .then((profile) => {
          if (profile) {
            setUser((prev) => ({ ...(prev || {}), ...profile }));
            refreshAll();
          }
        })
        .catch(() => {
          // Token expired or invalid
          logout();
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [refreshAll]);

  const switchFestival = async (fest) => {
    try {
      await api.put(`/festivals/${fest._id}/set-active`, {});
      setActiveFestival(fest);
      await loadDashboardStats(fest._id);
      showToast(`स्विच केले: ${fest.name}`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openNewPayment = (donor = null) => {
    setSelectedDonorForPayment(donor);
    setIsPaymentModalOpen(true);
  };

  const openAddDonor = (donorToEdit = null) => {
    setEditingDonor(donorToEdit);
    setIsDonorModalOpen(true);
  };

  const openReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        festivals,
        activeFestival,
        setActiveFestival,
        switchFestival,
        dashboardStats,
        loading,
        language,
        setLanguage,
        toggleLanguage: () => setLanguage((prev) => (prev === 'mr' ? 'en' : 'mr')),
        currentTab,
        setCurrentTab,
        reportSubTab,
        setReportSubTab,
        selectedReportBook,
        setSelectedReportBook,
        openPendingDonors,
        openBookReport,
        user,
        setUser,
        token,
        login,
        logout,
        toast,
        showToast,
        refreshAll,
        loadDashboardStats,
        // Modal Controls
        isPaymentModalOpen,
        setIsPaymentModalOpen,
        selectedDonorForPayment,
        openNewPayment,
        isDonorModalOpen,
        setIsDonorModalOpen,
        editingDonor,
        openAddDonor,
        isExpenseModalOpen,
        setIsExpenseModalOpen,
        isReceiptModalOpen,
        setIsReceiptModalOpen,
        selectedReceipt,
        openReceipt,
        isFestivalModalOpen,
        setIsFestivalModalOpen,
        isOpeningBalanceModalOpen,
        setIsOpeningBalanceModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
