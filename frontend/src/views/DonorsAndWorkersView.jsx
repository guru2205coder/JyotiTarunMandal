import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { formatINR } from '../utils/marathiWords';
import confetti from 'canvas-confetti';
import {
  Users,
  UserPlus,
  HelpCircle,
  Edit3,
  Phone,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  History,
  Share2,
  Trash2,
  Receipt,
  MessageSquare,
  BookOpen,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

export const DonorsAndWorkersView = () => {
  const {
    activeFestival,
    openAddDonor,
    openNewPayment,
    openReceipt,
    showToast,
    language,
    user,
    setUser,
    refreshAll,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState('karyakarta'); // 'karyakarta' | 'donors'
  const [karyakartas, setKaryakartas] = useState([]);
  const [allDonors, setAllDonors] = useState([]);
  const [bookStats, setBookStats] = useState({ books: [], overall: {} });
  const [selectedBookFilter, setSelectedBookFilter] = useState('all'); // 'all' or specific bookNo
  const [loading, setLoading] = useState(true);
  const [showWhoCanDoWhat, setShowWhoCanDoWhat] = useState(false);
  const [donorSearch, setDonorSearch] = useState('');
  const [donorStatusFilter, setDonorStatusFilter] = useState('all');
  const [expandedDonorId, setExpandedDonorId] = useState(null);

  // Load Karyakartas
  const loadKaryakartas = () => {
    if (!activeFestival) return;
    api.get(`/users/karyakartas?festivalId=${activeFestival._id}`)
      .then((data) => setKaryakartas(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  // Load Book Category Stats
  const loadBookStats = () => {
    if (!activeFestival) return;
    api.get(`/donors/book-stats?festivalId=${activeFestival._id}`)
      .then((data) => setBookStats(data || { books: [], overall: {} }))
      .catch(console.error);
  };

  // Load Donors
  const loadDonors = (showSpinner = false) => {
    if (!activeFestival) return;
    if (showSpinner) setLoading(true);
    api.get(`/donors?festivalId=${activeFestival._id}`)
      .then((data) => setAllDonors(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Load festival data in one parallel batch; tabs and category filtering are 0ms instant
  useEffect(() => {
    if (!activeFestival) return;
    setLoading(true);
    Promise.all([
      api.get(`/users/karyakartas?festivalId=${activeFestival._id}`).catch(() => []),
      api.get(`/donors/book-stats?festivalId=${activeFestival._id}`).catch(() => ({ books: [], overall: {} })),
      api.get(`/donors?festivalId=${activeFestival._id}`).catch(() => []),
    ])
      .then(([kList, bStats, dList]) => {
        setKaryakartas(Array.isArray(kList) ? kList : []);
        setBookStats(bStats || { books: [], overall: {} });
        setAllDonors(Array.isArray(dList) ? dList : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeFestival]);

  // Instant 0ms in-memory filtering for book categories, status pills, and search
  const donors = React.useMemo(() => {
    let list = allDonors;

    if (selectedBookFilter !== 'all') {
      const bNorm = selectedBookFilter.trim().toLowerCase();
      list = list.filter((d) => (d.bookNo || '').trim().toLowerCase() === bNorm);
    }

    if (donorStatusFilter !== 'all') {
      if (donorStatusFilter === 'pending_all' || donorStatusFilter === 'has_remaining') {
        list = list.filter((d) => (d.remaining || 0) > 0);
      } else {
        list = list.filter((d) => d.status === donorStatusFilter);
      }
    }

    if (donorSearch.trim()) {
      const q = donorSearch.trim().toLowerCase();
      list = list.filter((d) => {
        const name = (d.name || '').toLowerCase();
        const mobile = (d.mobile || '').toLowerCase();
        const area = (d.area || '').toLowerCase();
        const book = (d.bookNo || '').toLowerCase();
        const receipt = (d.physicalReceiptNo || d.receiptNo || '').toString().toLowerCase();
        return name.includes(q) || mobile.includes(q) || area.includes(q) || book.includes(q) || receipt.includes(q);
      });
    }

    return list;
  }, [allDonors, selectedBookFilter, donorStatusFilter, donorSearch]);

  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerMobile, setWorkerMobile] = useState('');
  const [workerRole, setWorkerRole] = useState('Volunteer');
  const [workerPassword, setWorkerPassword] = useState('123456');
  const [showWorkerPass, setShowWorkerPass] = useState(false);
  const [addedWorkerCredentials, setAddedWorkerCredentials] = useState(null);

  // Edit Worker State
  const [isEditWorkerModalOpen, setIsEditWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerMobile, setEditWorkerMobile] = useState('');
  const [editWorkerRole, setEditWorkerRole] = useState('Volunteer');
  const [editWorkerPassword, setEditWorkerPassword] = useState('');
  const [showEditPass, setShowEditPass] = useState(false);
  const [editWorkerSaving, setEditWorkerSaving] = useState(false);

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const resetWorkerForm = () => {
    setWorkerName('');
    setWorkerEmail('');
    setWorkerMobile('');
    setWorkerRole('Volunteer');
    setWorkerPassword('123456');
    setShowWorkerPass(false);
    setAddedWorkerCredentials(null);
  };

  const handleShareWorkerWhatsApp = (worker, customPassword = null) => {
    const loginUrl = window.location.origin;
    const phone = (worker.mobile || '').replace(/\D/g, '');
    const pass = customPassword || worker.password || worker.initialPassword || '123456';

    let msg = `🚩 *${activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर'}*\n*वर्गणी संकलन ॲप - अधिकृत लॉगिन तपशील*\n\nसस्नेह नमस्कार, *${worker.name}* जी!\nमंडळाच्या वर्गणी संकलन ॲपमध्ये आपले स्वागत आहे.\n\n📲 *आपले लॉगिन तपशील:*\n• 👤 वापरकर्ता / नाव: ${worker.name}\n• 📱 मोबाईल नंबर: ${worker.mobile || '-'}\n• 📧 ईमेल: ${worker.email || '-'}\n• 🔑 पासवर्ड: *${pass}*\n• 🛡️ नियुक्त भूमिका: ${worker.role || 'Volunteer'}\n\n🌐 *लॉगिन करण्यासाठी खालील लिंकवर क्लिक करा:*\n${loginUrl}\n\n⚠️ *टीप:* लॉगिन केल्यानंतर सुरक्षिततेसाठी आपला पासवर्ड बदलून घ्यावा.\n\n🙏 मंडळास सहकार्य केल्याबद्दल धन्यवाद!`;

    const encoded = encodeURIComponent(msg);
    const url = phone
      ? `https://api.whatsapp.com/send?phone=91${phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, '_blank');
  };

  const openEditWorker = (k) => {
    setEditingWorker(k);
    setEditWorkerName(k.name || '');
    setEditWorkerMobile(k.mobile || '');
    setEditWorkerRole(k.role || 'Volunteer');
    setEditWorkerPassword('');
    setShowEditPass(false);
    setIsEditWorkerModalOpen(true);
  };

  const handleEditWorker = async (e) => {
    e.preventDefault();
    if (!editWorkerName.trim()) {
      showToast('नाव आवश्यक आहे', 'error');
      return;
    }
    setEditWorkerSaving(true);
    try {
      const res = await api.put('/users/profile', {
        id: editingWorker._id,
        name: editWorkerName.trim(),
        mobile: editWorkerMobile.trim(),
        role: editWorkerRole,
        ...(editWorkerPassword.trim().length >= 4 ? { password: editWorkerPassword.trim() } : {}),
      });

      // If the edited worker is the currently logged in user, sync session immediately
      if (res && user && (res._id === user._id || editingWorker._id === user._id)) {
        const updatedUser = { ...user, ...res };
        setUser(updatedUser);
        localStorage.setItem('vargani_user', JSON.stringify(updatedUser));
      }

      showToast(`"${editWorkerName.trim()}" यांची भूमिका व माहिती अपडेट झाली!`);
      setIsEditWorkerModalOpen(false);
      setEditingWorker(null);
      loadKaryakartas();
      refreshAll();
    } catch (err) {
      showToast(err.message || 'Error updating karyakarta', 'error');
    } finally {
      setEditWorkerSaving(false);
    }
  };

  const handleDeleteWorker = async (worker) => {
    if (user?.role !== 'Admin') {
      showToast('कार्यकर्ता हटवण्याचा अधिकार फक्त मुख्य ॲडमिनला आहे', 'error');
      return;
    }

    if (user?._id === worker._id) {
      showToast('तुम्ही स्वतःचे ॲडमिन खाते हटवू शकत नाही', 'error');
      return;
    }

    let confirmMsg = `कार्यकर्ता "${worker.name}" (${worker.role}) यांचे खाते कायमचे हटवायचे आहे का?`;
    if (worker.totalCollected && worker.totalCollected > 0) {
      confirmMsg = `⚠️ सावधान: कार्यकर्ता "${worker.name}" यांनी ₹${worker.totalCollected.toLocaleString('en-IN')} चे संकलन केले आहे.\nत्यांचे खाते हटवले तरी यापूर्वी फाडलेल्या पावत्या व नोंदी सुरक्षित राहतील.\n\nकार्यकर्ता खाते कायमचे हटवायचे आहे का?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/users/${worker._id}`);
      showToast(`कार्यकर्ता "${worker.name}" यांचे खाते यशस्वीरीत्या हटवले`);
      if (isEditWorkerModalOpen && editingWorker?._id === worker._id) {
        setIsEditWorkerModalOpen(false);
        setEditingWorker(null);
      }
      loadKaryakartas();
      refreshAll();
    } catch (err) {
      showToast(err.message || 'Error deleting karyakarta', 'error');
    }
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!workerName || !workerEmail) {
      showToast('नाव व ईमेल आवश्यक आहे', 'error');
      return;
    }
    if (!workerPassword || workerPassword.trim().length < 4) {
      showToast('पासवर्ड किमान ४ अक्षरांचा असावा', 'error');
      return;
    }
    try {
      const created = await api.post('/users/karyakarta', {
        name: workerName.trim(),
        email: workerEmail.trim().toLowerCase(),
        mobile: workerMobile.trim(),
        role: workerRole,
        password: workerPassword.trim(),
        title: `${workerRole} कार्यकर्ता`,
      });
      setAddedWorkerCredentials({
        name: workerName.trim(),
        mobile: workerMobile.trim(),
        email: workerEmail.trim().toLowerCase(),
        password: workerPassword.trim(),
        role: workerRole,
      });
      showToast(`कार्यकर्ता "${workerName.trim()}" यशस्वीरीत्या जोडला!`);
      loadKaryakartas();
    } catch (err) {
      showToast(err.message || 'Error adding karyakarta', 'error');
    }
  };

  const handleSendReminder = (donor) => {
    const promised = donor.promisedAmount || 0;
    const paid = donor.totalPaid || 0;
    const remaining = donor.remaining !== undefined ? donor.remaining : Math.max(0, promised - paid);

    const text = `🚩 *${activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर'}*\n*${activeFestival?.name || 'नवरात्र उत्सव २०२६'}*\n\nसस्नेह नमस्कार, *${donor.name}* जी.\nमंडळाच्या उत्सवासाठी आपली ठरलेली वर्गणी रक्कम ₹${promised.toLocaleString('en-IN')} असून, यापूर्वी ₹${paid.toLocaleString('en-IN')} जमा झालेली आहे.\nअद्याप *₹${remaining.toLocaleString('en-IN')}* वर्गणी शिल्लक आहे.\n\nकृपया मंडळाच्या कार्यकर्त्यांकडे उर्वरित वर्गणी जमा करून डिजिटल पावती प्राप्त करून घ्यावी ही नम्र विनंती.\n\n🙏 मंडळास सहकार्य केल्याबद्दल धन्यवाद!`;

    const encoded = encodeURIComponent(text);
    const url = donor.mobile
      ? `https://api.whatsapp.com/send?phone=91${donor.mobile.replace(/\D/g, '')}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleDeleteDonor = async (donor) => {
    const hasPayments = (donor.totalPaid && donor.totalPaid > 0) || (donor.payments && donor.payments.length > 0);
    
    let confirmMsg = `देणगीदार "${donor.name}" हटवायचे आहेत का?`;
    if (hasPayments) {
      const pCount = donor.installmentCount || donor.payments?.length || 1;
      confirmMsg = `⚠️ सावधान: देणगीदार "${donor.name}" चे ${pCount} पेमेंट रेकॉर्ड्स (₹${(donor.totalPaid || 0).toLocaleString('en-IN')}) आहेत.\n\nया देणगीदारासह सर्व पावत्या व रेकॉर्ड्स कायमचे हटवायचे आहेत का?\n(ही क्रिया पूर्ववत करता येणार नाही)`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      const url = hasPayments ? `/donors/${donor._id}?cascade=true` : `/donors/${donor._id}`;
      await api.delete(url);
      showToast('देणगीदार यशस्वीरीत्या हटवले');
      loadDonors();
      loadBookStats();
      refreshAll();
    } catch (err) {
      showToast(err.message || 'Error deleting donor', 'error');
    }
  };

  const handleExportDonorsCSV = () => {
    if (!donors || donors.length === 0) {
      showToast('कोणताही डेटा उपलब्ध नाही', 'error');
      return;
    }

    const headers = [
      'Sr No',
      'Donor Name',
      'Mobile',
      'Book No',
      'Receipt No',
      'Promised Amount',
      'Total Paid',
      'Remaining',
      'Status',
      'Installment Count',
    ];
    const rows = donors.map((d, index) => [
      index + 1,
      `"${(d.name || '').replace(/"/g, '""')}"`,
      `"${(d.mobile || '').replace(/"/g, '""')}"`,
      `"${(d.bookNo || (selectedBookFilter !== 'all' ? selectedBookFilter : '')).replace(/"/g, '""')}"`,
      `"${(d.physicalReceiptNo || '').replace(/"/g, '""')}"`,
      d.promisedAmount || 0,
      d.totalPaid || 0,
      d.remaining !== undefined ? d.remaining : Math.max(0, (d.promisedAmount || 0) - (d.totalPaid || 0)),
      `"${(d.status || '').replace(/"/g, '""')}"`,
      d.installmentCount || (d.payments?.length || 0),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileLabel = selectedBookFilter !== 'all' ? selectedBookFilter.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All_Books';
    link.setAttribute('download', `Vargani_Donors_${fileLabel}_${activeFestival?.year || 2026}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`देणगीदार तपशील (${selectedBookFilter !== 'all' ? selectedBookFilter : 'सर्व वह्या'}) Excel डाऊनलोड झाली!`);
  };

  const handleQuickPayFull = async (donor) => {
    const promised = donor.promisedAmount || 0;
    const paid = donor.totalPaid || 0;
    const remaining = donor.remaining !== undefined ? donor.remaining : Math.max(0, promised - paid);

    if (remaining <= 0) {
      showToast('या देणगीदाराची वर्गणी यापूर्वीच पूर्ण भरली आहे', 'info');
      return;
    }

    if (!window.confirm(`देणगीदार "${donor.name}" यांची उर्वरित वर्गणी ₹${remaining.toLocaleString('en-IN')} पूर्ण जमा करायची आहे का?`)) {
      return;
    }

    try {
      const receipt = await api.post('/payments', {
        festivalId: activeFestival?._id,
        donorId: donor._id,
        amount: remaining,
        paymentMethod: 'Cash',
        bookNo: donor.bookNo || 'Book-1',
        collectedBy: user?.name || 'Gururaj',
        notes: 'त्वरित पूर्ण भरणा जमा (One-click full paid)',
      });

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      showToast(`🎉 ₹${remaining.toLocaleString('en-IN')} पूर्ण भरणा यशस्वी! पावती #${receipt.receiptNo}`);
      loadDonors();
      loadBookStats();
      refreshAll();
      openReceipt(receipt);
    } catch (err) {
      showToast(err.message || 'Error recording payment', 'error');
    }
  };

  // Compute active book summary for financial statistics card (instant 0ms update)
  const activeBookObj = React.useMemo(() => {
    if (selectedBookFilter === 'all') {
      return {
        label: 'सर्व पावती पुस्तके (All Books)',
        donorCount: bookStats.overall?.totalDonors || allDonors.length,
        totalPromised: bookStats.overall?.totalPromised || allDonors.reduce((s, d) => s + (d.promisedAmount || 0), 0),
        totalCollected: bookStats.overall?.totalCollected || allDonors.reduce((s, d) => s + (d.totalPaid || 0), 0),
        totalRemaining: bookStats.overall?.totalRemaining || allDonors.reduce((s, d) => s + (d.remaining || 0), 0),
      };
    }
    const found = bookStats.books?.find(
      (b) => b.bookNo.toLowerCase() === selectedBookFilter.trim().toLowerCase()
    );
    if (found) return found;

    const bookDonors = allDonors.filter(
      (d) => (d.bookNo || '').trim().toLowerCase() === selectedBookFilter.trim().toLowerCase()
    );
    return {
      label: `वही क्र. ${selectedBookFilter}`,
      donorCount: bookDonors.length,
      totalPromised: bookDonors.reduce((s, d) => s + (d.promisedAmount || 0), 0),
      totalCollected: bookDonors.reduce((s, d) => s + (d.totalPaid || 0), 0),
      totalRemaining: bookDonors.reduce((s, d) => s + (d.remaining || 0), 0),
    };
  }, [selectedBookFilter, bookStats, allDonors]);

  const percentCollected = activeBookObj.totalPromised > 0
    ? Math.min(100, Math.round((activeBookObj.totalCollected / activeBookObj.totalPromised) * 100))
    : 0;

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Sub-Tab Navigation Bar */}
      <div className="flex bg-[#16171c] p-1 rounded-2xl border border-[#262932]">
        <button
          onClick={() => setActiveSubTab('karyakarta')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'karyakarta'
              ? 'bg-[#FF5A1F] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users size={15} />
          <span>कार्यकर्ते (Karyakarta)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('donors')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'donors'
              ? 'bg-[#FF5A1F] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen size={15} />
          <span>देणगीदार व वह्या ({bookStats.overall?.totalDonors || donors.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: KARYAKARTA VIEW */}
      {activeSubTab === 'karyakarta' ? (
        <div className="space-y-4">
          <div className="bg-[#121316] border border-[#21242d] rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">कोण काय करू शकते? (Who Can Do What)</span>
            <button
              onClick={() => setShowWhoCanDoWhat(!showWhoCanDoWhat)}
              className="text-[#FF5A1F] font-bold hover:underline"
            >
              {showWhoCanDoWhat ? 'लपवा' : 'माहिती पहा'}
            </button>
          </div>

          {showWhoCanDoWhat && (
            <div className="bg-[#16181f] border border-[#282c38] rounded-2xl p-4 text-xs text-zinc-300 space-y-2 animate-in fade-in">
              <p className="font-bold text-white flex items-center gap-1.5 text-sm">
                <HelpCircle size={15} className="text-[#FF5A1F]" />
                कार्यकर्ता अधिकार व भूमिका
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong>Admin (प्रशासक):</strong> सर्व देणगीदार, हप्ते, खर्च, पावत्या, अहवाल व डेटाबेस व्यवस्थापन.</li>
                <li><strong>Treasurer (खजिनदार):</strong> जमा, खर्च नोंद, दैनिक संकलन व ताळेबंद पडताळणी.</li>
                <li><strong>Volunteer (स्वयंसेवक):</strong> नवीन देणगीदार जोडणे आणि हप्ता पावती तयार करणे.</li>
              </ul>
            </div>
          )}

          {/* Karyakarta Cards */}
          <div className="space-y-2.5">
            {karyakartas.map((k) => (
              <div
                key={k._id}
                className="rounded-[22px] bg-[#1a1b20] border border-[#282b36] p-4 flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FF5A1F] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
                    {k.initial || 'G'}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-sm text-zinc-100">{k.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#0f2d29] border border-[#18544d] text-[#2DD4BF] text-[10.5px] font-bold">
                        {k.role}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {k.title || 'registered the mandal'}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      @ {k.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-right mr-1">
                      <span className="text-base font-extrabold text-[#2DD4BF] block">
                        {formatINR(k.totalCollected || 0)}
                      </span>
                      <span className="text-[10px] text-zinc-500">जमा केले</span>
                    </div>
                    {user?.role === 'Admin' && k.mobile && (
                      <button
                        onClick={() => handleShareWorkerWhatsApp(k, k.initialPassword || k.password)}
                        className="p-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 transition"
                        title="WhatsApp वर लॉगिन लिंक व तपशील पाठवा"
                      >
                        <Share2 size={15} />
                      </button>
                    )}
                    {user?.role === 'Admin' && (
                      <button
                        onClick={() => openEditWorker(k)}
                        className="p-2 rounded-xl bg-[#1f2230] border border-[#2e3348] text-zinc-400 hover:text-white hover:border-[#FF5A1F] transition"
                        title="कार्यकर्ता माहिती बदला (Admin only)"
                      >
                        <Edit3 size={15} />
                      </button>
                    )}
                    {user?.role === 'Admin' && k._id !== user?._id && (
                      <button
                        onClick={() => handleDeleteWorker(k)}
                        className="p-2 rounded-xl bg-[#29171b] border border-[#482025] text-red-400 hover:bg-[#3d1c21] hover:text-red-300 transition"
                        title="कार्यकर्ता खाते हटवा (Admin only)"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
              </div>
            ))}
          </div>

          {/* Non-admin notice */}
          {user?.role !== 'Admin' && (
            <div className="bg-[#14161c] border border-[#222530] rounded-2xl p-3 text-center text-xs text-zinc-400">
              ℹ️ नवीन कार्यकर्ता जोडणे व पासवर्ड बदल करण्याचे अधिकार फक्त 👑 <strong>मुख्य ॲडमिन</strong>कडे आहेत.
            </div>
          )}

          {/* Add Karyakarta button (Admin only) */}
          {user?.role === 'Admin' && (
            <div className="fixed bottom-16 right-4 sm:right-8 z-30">
              <button
                onClick={() => setIsAddWorkerModalOpen(true)}
                className="py-3 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E04C00] text-white font-bold text-sm shadow-xl shadow-orange-950/60 flex items-center gap-2 border border-orange-400/40 active:scale-95 transition"
              >
                <UserPlus size={18} />
                <span>Add Karyakarta</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* SUB-TAB 2: DONORS & BOOK NUMBERS VIEW */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">देणगीदार (Donors)</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{activeFestival?.name || 'नवरात्र उत्सव'}</p>
            </div>
            <button
              onClick={() => openAddDonor()}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF5A1F] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#E04C00] transition shadow-md"
            >
              <UserPlus size={14} />
              <span>+ देणगीदार</span>
            </button>
          </div>

          {/* REQUIREMENT: Category based on Book Number tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                <BookOpen size={14} className="text-[#FF5A1F]" />
                पावती वही वर्गवारी (Category by Book No):
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                {bookStats.books?.length || 1} वह्या उपलब्ध
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {/* All Books Tab */}
              <button
                onClick={() => setSelectedBookFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedBookFilter === 'all'
                    ? 'bg-[#FF5A1F] text-white shadow-md'
                    : 'bg-[#181a1f] border border-[#272b36] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers size={13} />
                <span>सर्व वह्या ({bookStats.overall?.totalDonors || donors.length})</span>
              </button>

              {/* Dynamic Book Number Buttons */}
              {bookStats.books?.map((b) => {
                const isSelected = selectedBookFilter === b.bookNo;
                return (
                  <button
                    key={b.bookNo}
                    onClick={() => setSelectedBookFilter(b.bookNo)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#0f2d29] border border-[#2DD4BF] text-[#2DD4BF] shadow-md font-extrabold'
                        : 'bg-[#181a1f] border border-[#272b36] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <BookOpen size={13} className={isSelected ? 'text-[#2DD4BF]' : 'text-zinc-500'} />
                    <span>{b.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${isSelected ? 'bg-[#164e47] text-white' : 'bg-[#22252e] text-zinc-400'}`}>
                      {b.donorCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* REQUIREMENT: Total amount collected, balance, and remaining based on book number */}
          <div className="rounded-[24px] bg-gradient-to-br from-[#161822] to-[#101217] border border-[#262a37] p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <BookOpen size={14} className="text-[#FF5A1F]" />
                {activeBookObj.label} - वित्तीय हिशोब
              </span>
              <span className="text-[11px] text-zinc-400 font-semibold">
                {activeBookObj.donorCount} देणगीदार
              </span>
            </div>

            {/* 3 Metric Summary Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#121318] p-2.5 rounded-xl border border-[#20232e]">
                <span className="text-[10px] text-zinc-400 block font-medium">एकूण जमा (Collected)</span>
                <span className="text-sm sm:text-base font-black text-[#22C55E]">
                  {formatINR(activeBookObj.totalCollected)}
                </span>
              </div>
              <div
                onClick={() => setDonorStatusFilter(donorStatusFilter === 'pending_all' ? 'all' : 'pending_all')}
                className={`p-2.5 rounded-xl border cursor-pointer transition group ${
                  donorStatusFilter === 'pending_all'
                    ? 'bg-[#2a170e] border-amber-500 shadow-sm'
                    : 'bg-[#121318] border-[#20232e] hover:border-amber-500/50'
                }`}
                title="फक्त बाकीदार पाहण्यासाठी क्लिक करा"
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] text-zinc-400 group-hover:text-amber-300 font-medium">शिल्लक बाकी (Remaining)</span>
                  <span className="text-[9px] text-amber-400 font-bold">
                    {donorStatusFilter === 'pending_all' ? '✓ सक्रिय' : 'पहा →'}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-amber-400 block mt-0.5">
                  {formatINR(activeBookObj.totalRemaining)}
                </span>
              </div>
              <div className="bg-[#121318] p-2.5 rounded-xl border border-[#20232e]">
                <span className="text-[10px] text-zinc-400 block font-medium">ठरलेली वर्गणी (Balance)</span>
                <span className="text-sm sm:text-base font-black text-zinc-200">
                  {formatINR(activeBookObj.totalPromised)}
                </span>
              </div>
            </div>

            {/* Book Collection Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                <span>संकलन प्रगती: {percentCollected}%</span>
                <span>जमा: {formatINR(activeBookObj.totalCollected)} / {formatINR(activeBookObj.totalPromised)}</span>
              </div>
              <div className="h-2 w-full bg-[#1e212b] rounded-full overflow-hidden">
                <div
                  style={{ width: `${percentCollected}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* Search bar (Name, Mobile, Book Number) */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              value={donorSearch}
              onChange={(e) => setDonorSearch(e.target.value)}
              placeholder="नाव, मोबाईल किंवा वही क्र. शोधा..."
              className="w-full bg-[#181a1f] border border-[#272b36] rounded-2xl pl-10 pr-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F] transition placeholder:text-zinc-500"
            />
            {donorSearch && (
              <button
                onClick={() => setDonorSearch('')}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Book Filter Bar & Quick Excel Export */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedBookFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                  selectedBookFilter === 'all'
                    ? 'bg-[#FF5A1F] text-white shadow-sm'
                    : 'bg-[#181a1f] border border-[#272b36] text-zinc-400 hover:text-white'
                }`}
              >
                <Layers size={11} />
                <span>सर्व वह्या (All)</span>
              </button>
              {bookStats?.books?.map((b) => (
                <button
                  key={b.bookNo}
                  onClick={() => setSelectedBookFilter(b.bookNo)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                    selectedBookFilter === b.bookNo
                      ? 'bg-[#0f2d29] border border-[#2DD4BF] text-[#2DD4BF] shadow-sm font-extrabold'
                      : 'bg-[#181a1f] border border-[#272b36] text-zinc-300 hover:text-white'
                  }`}
                >
                  <BookOpen size={11} className={selectedBookFilter === b.bookNo ? 'text-[#2DD4BF]' : 'text-zinc-500'} />
                  <span>{b.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({b.donorCount})</span>
                </button>
              ))}
            </div>

            {/* Quick Excel Export */}
            {(user?.role === 'Admin' || user?.role === 'Treasurer') && (
              <button
                onClick={handleExportDonorsCSV}
                className="px-2.5 py-1 rounded-xl bg-[#1c1f26] border border-[#2b2f3a] text-[#2DD4BF] text-xs font-bold flex items-center gap-1 hover:bg-[#252833] transition whitespace-nowrap shrink-0 shadow-sm"
                title="Excel (CSV) Download"
              >
                <FileSpreadsheet size={13} />
                <span>Excel (CSV)</span>
              </button>
            )}
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'सर्व (All)' },
              { id: 'pending_all', label: '⚠️ सर्व बाकीदार (All Pending)' },
              { id: 'pending', label: 'बाकी (0 जमा)' },
              { id: 'partially_paid', label: 'अपूर्ण (Partial)' },
              { id: 'fully_paid', label: 'पूर्ण भरणा (Fully Paid)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDonorStatusFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  donorStatusFilter === f.id
                    ? 'bg-[#FF5A1F] text-white'
                    : 'bg-[#181a1f] border border-[#272b36] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Donors list - Address & Business name removed as requested */}
          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-xs">लोड होत आहे...</div>
          ) : donors.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-zinc-400 text-sm">कोणतेही देणगीदार सापडले नाहीत</p>
              <button
                onClick={() => openAddDonor()}
                className="text-xs font-bold text-[#FF5A1F] hover:underline"
              >
                + नवीन देणगीदार जोडा
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {donors.map((d, index) => {
                const promised = d.promisedAmount || 0;
                const paid = d.totalPaid || 0;
                const remaining = d.remaining !== undefined ? d.remaining : Math.max(0, promised - paid);

                return (
                  <div
                    key={d._id}
                    className="rounded-[22px] bg-[#16171c] border border-[#252832] p-4 shadow-sm hover:border-[#383d4c] transition space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-[#20222a] text-zinc-400 text-[10.5px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <h3 className="font-extrabold text-base text-zinc-100">{d.name}</h3>

                          {d.status === 'fully_paid' && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                              पूर्ण भरणा
                            </span>
                          )}
                          {d.status === 'partially_paid' && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800">
                              अपूर्ण
                            </span>
                          )}
                          {d.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              बाकी
                            </span>
                          )}
                        </div>

                        {/* Clean Details: Book No & Mobile (Address, Business Name & Area omitted) */}
                        <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap pt-0.5">
                          {d.bookNo && (
                            <span className="px-2 py-0.5 rounded-md bg-[#191d27] border border-[#262c3b] text-zinc-300 font-semibold flex items-center gap-1 text-[11px]">
                              <BookOpen size={11} className="text-[#FF5A1F]" />
                              <span>वही क्र. {d.bookNo}</span>
                            </span>
                          )}
                          {d.mobile && (
                            <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                              <Phone size={10} />
                              <span>{d.mobile}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action icons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {remaining > 0 && (
                          <button
                            onClick={() => handleSendReminder(d)}
                            className="p-1.5 rounded-lg bg-[#143d2c] text-[#25D366] hover:bg-[#1a523b] transition"
                            title="WhatsApp वर आठवण पाठवा"
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => openAddDonor(d)}
                          className="p-1.5 rounded-lg bg-[#20222a] text-zinc-400 hover:text-white transition"
                          title="Edit Donor"
                        >
                          <Edit3 size={14} />
                        </button>
                        {user?.role === 'Admin' && (
                          <button
                            onClick={() => handleDeleteDonor(d)}
                            className="p-1.5 rounded-lg bg-[#20222a] text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition"
                            title="देणगीदार हटवा (Delete Donor - Admin only)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financial summary bar */}
                    <div className="grid grid-cols-3 gap-2 bg-[#121316] p-2.5 rounded-xl border border-[#22252e] text-center text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">ठरलेली</span>
                        <span className="font-bold text-zinc-200">{formatINR(promised)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">एकूण जमा</span>
                        <span className="font-bold text-emerald-400">{formatINR(paid)}</span>
                      </div>
                      <div className={`rounded-lg py-0.5 ${remaining > 0 ? 'bg-[#261710] border border-[#402315]' : ''}`}>
                        <span className={`text-[10px] block ${remaining > 0 ? 'text-amber-300 font-semibold' : 'text-zinc-500'}`}>
                          शिल्लक बाकी
                        </span>
                        <span className={`font-black ${remaining === 0 ? 'text-zinc-500' : 'text-amber-400 text-xs sm:text-sm'}`}>
                          {formatINR(remaining)}
                        </span>
                      </div>
                    </div>

                    {/* Quick collect & history buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openNewPayment(d)}
                        className="flex-1 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#E04C00] text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Plus size={15} />
                        <span>हप्ता जमा करा</span>
                      </button>



                      {d.payments && d.payments.length > 0 && (
                        <button
                          onClick={() => setExpandedDonorId(expandedDonorId === d._id ? null : d._id)}
                          className="px-3 py-2 rounded-xl bg-[#1c1f26] border border-[#2b2f3a] text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
                          title="पावती व हप्ता इतिहास"
                        >
                          <Receipt size={14} className="text-[#2DD4BF]" />
                          <span>हप्ते ({d.payments.length})</span>
                          {expandedDonorId === d._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}
                    </div>

                    {/* Expanded Installments Drawer */}
                    {expandedDonorId === d._id && d.payments && d.payments.length > 0 && (
                      <div className="pt-2 border-t border-[#232731] space-y-2 animate-in fade-in">
                        <span className="text-[11px] font-bold text-[#2DD4BF] uppercase tracking-wider block">
                          पावती व हप्ता तपशील:
                        </span>
                        <div className="space-y-1.5">
                          {d.payments.map((p, idx) => (
                            <div
                              key={p._id}
                              className="bg-[#121316] border border-[#232630] rounded-xl p-2.5 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-[#0f2d29] text-[#2DD4BF] text-[10px] font-bold flex items-center justify-center">
                                  #{p.installmentNumber || idx + 1}
                                </span>
                                <div>
                                  <span className="font-bold text-zinc-200">
                                    पावती क्र. {p.receiptNo}
                                  </span>
                                  <span className="text-[11px] text-zinc-500 ml-2">
                                    {new Date(p.paymentDate).toLocaleDateString('mr-IN', { day: '2-digit', month: 'short' })} • {p.paymentMethod}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-400">
                                  {formatINR(p.amount)}
                                </span>
                                <button
                                  onClick={() => openReceipt({ ...p, donor: d, festival: activeFestival })}
                                  className="px-2 py-0.5 rounded-lg bg-[#1f222b] text-zinc-300 hover:text-white text-[11px] font-medium transition"
                                >
                                  पावती पहा
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Action Button "+ Add Donor" */}
          <div className="fixed bottom-16 right-4 sm:right-8 z-30">
            <button
              onClick={() => openAddDonor()}
              className="py-3 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E04C00] text-white font-bold text-sm shadow-xl shadow-orange-950/60 flex items-center gap-2 border border-orange-400/40 active:scale-95 transition"
            >
              <UserPlus size={18} />
              <span>Add Donor</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Karyakarta Modal */}
      {isAddWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#16181d] border border-[#2b2e38] w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#242731] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#FF5A1F]" />
                <h3 className="font-bold text-white text-base">नवीन कार्यकर्ता जोडा</h3>
              </div>
              <button
                onClick={() => { setIsAddWorkerModalOpen(false); resetWorkerForm(); }}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Success Credential Card - shown after creation */}
            {addedWorkerCredentials ? (
              <div className="space-y-4">
                <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    कार्यकर्ता यशस्वीरीत्या जोडला! खाली लॉगिन माहिती नोंदवा:
                  </p>
                  <div className="bg-[#0f1a16] rounded-xl p-3 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">नाव:</span>
                      <span className="text-white font-bold">{addedWorkerCredentials.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">मोबाईल:</span>
                      <span className="text-zinc-100">{addedWorkerCredentials.mobile || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">ईमेल:</span>
                      <span className="text-zinc-100 truncate max-w-[140px]">{addedWorkerCredentials.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">पासवर्ड:</span>
                      <span className="text-emerald-300 font-extrabold tracking-widest">{addedWorkerCredentials.password}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">भूमिका:</span>
                      <span className="text-[#FF5A1F] font-bold">{addedWorkerCredentials.role}</span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-amber-300/80 leading-relaxed">
                    ⚠️ हा पासवर्ड कार्यकर्त्याला WhatsApp वर पाठवा. ते लॉगिन केल्यानंतर बदलू शकतात.
                  </p>
                  {addedWorkerCredentials.mobile && (
                    <button
                      type="button"
                      onClick={() => handleShareWorkerWhatsApp(addedWorkerCredentials, addedWorkerCredentials.password)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/30 transition shadow-sm"
                    >
                      <Share2 size={14} />
                      WhatsApp वर लॉगिन लिंक व माहिती पाठवा
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setIsAddWorkerModalOpen(false); resetWorkerForm(); }}
                  className="w-full py-2.5 rounded-xl bg-[#FF5A1F] text-white font-bold hover:bg-[#E04C00] transition"
                >
                  बंद करा
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleAddWorker} className="space-y-3 text-xs">

                {/* Info box */}
                <div className="bg-[#1a1d26] border border-[#2c3045] rounded-xl p-3 text-[11px] text-zinc-400 leading-relaxed">
                  <p className="font-bold text-zinc-200 mb-1 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-[#FF5A1F]" />
                    लॉगिन कसे होते?
                  </p>
                  कार्यकर्ता त्यांच्या <span className="text-white font-semibold">मोबाईल नंबर किंवा ईमेल</span> + <span className="text-white font-semibold">खाली दिलेला पासवर्ड</span> वापरून लॉगिन करू शकतात. हा पासवर्ड त्यांना स्वतः बदलता येत नाही (Admin ने बदलावा).
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">नाव *</label>
                  <input
                    type="text"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="उदा. सचिन मोरे"
                    className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#FF5A1F] transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">ईमेल *</label>
                  <input
                    type="email"
                    value={workerEmail}
                    onChange={(e) => setWorkerEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#FF5A1F] transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">मोबाईल (लॉगिनसाठी)</label>
                  <input
                    type="tel"
                    value={workerMobile}
                    onChange={(e) => setWorkerMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#FF5A1F] transition"
                  />
                  <p className="text-[10px] text-zinc-500 mt-0.5">मोबाईल नंबराने लॉगिन करता येईल</p>
                </div>

                {/* Password field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-semibold">पासवर्ड (Login Password) *</label>
                    <button
                      type="button"
                      onClick={() => setWorkerPassword(generatePassword())}
                      className="flex items-center gap-1 text-[10px] text-[#FF5A1F] font-bold hover:underline"
                    >
                      <RefreshCw size={11} />
                      नवीन तयार करा
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showWorkerPass ? 'text' : 'password'}
                      value={workerPassword}
                      onChange={(e) => setWorkerPassword(e.target.value)}
                      placeholder="किमान ४ अक्षरे"
                      className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 pr-10 text-zinc-100 font-mono focus:outline-none focus:border-[#FF5A1F] transition tracking-widest"
                      required
                      minLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => setShowWorkerPass(!showWorkerPass)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                    >
                      {showWorkerPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-400/80 mt-0.5">⚠️ हा पासवर्ड कार्यकर्त्यास द्या — ते या पासवर्डने लॉगिन करतील</p>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">भूमिका (Role)</label>
                  <select
                    value={workerRole}
                    onChange={(e) => setWorkerRole(e.target.value)}
                    className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#FF5A1F]"
                  >
                    <option value="Volunteer">Volunteer — वर्गणी जमा, देणगीदार जोडणे</option>
                    <option value="Treasurer">Treasurer — जमा + खर्च नोंद + ताळेबंद</option>
                    <option value="Admin">Admin — सर्व अधिकार (संपूर्ण व्यवस्थापन)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#FF5A1F] text-white font-bold hover:bg-[#E04C00] transition mt-1 flex items-center justify-center gap-2"
                >
                  <UserPlus size={15} />
                  कार्यकर्ता जोडा
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Edit Karyakarta Modal */}
      {isEditWorkerModalOpen && editingWorker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#16181d] border border-[#2b2e38] w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#242731] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FF5A1F] text-white flex items-center justify-center font-bold text-sm">
                  {editingWorker.initial || editingWorker.name?.charAt(0) || 'K'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">कार्यकर्ता बदला</h3>
                  <p className="text-[11px] text-zinc-500">{editingWorker.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setIsEditWorkerModalOpen(false); setEditingWorker(null); }}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditWorker} className="space-y-3 text-xs">
              {/* Name */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">नाव *</label>
                <input
                  type="text"
                  value={editWorkerName}
                  onChange={(e) => setEditWorkerName(e.target.value)}
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#FF5A1F] transition"
                  required
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">मोबाईल (लॉगिनसाठी)</label>
                <input
                  type="tel"
                  value={editWorkerMobile}
                  onChange={(e) => setEditWorkerMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#FF5A1F] transition"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">भूमिका (Role)</label>
                <select
                  value={editWorkerRole}
                  onChange={(e) => setEditWorkerRole(e.target.value)}
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#FF5A1F]"
                >
                  <option value="Volunteer">Volunteer — वर्गणी जमा, देणगीदार जोडणे</option>
                  <option value="Treasurer">Treasurer — जमा + खर्च नोंद + ताळेबंद</option>
                  <option value="Admin">Admin — सर्व अधिकार (संपूर्ण व्यवस्थापन)</option>
                </select>
              </div>

              {/* New Password (optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-semibold">नवीन पासवर्ड (ऐच्छिक)</label>
                  <button
                    type="button"
                    onClick={() => setEditWorkerPassword(generatePassword())}
                    className="flex items-center gap-1 text-[10px] text-[#FF5A1F] font-bold hover:underline"
                  >
                    <RefreshCw size={11} />
                    नवीन तयार करा
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPass ? 'text' : 'password'}
                    value={editWorkerPassword}
                    onChange={(e) => setEditWorkerPassword(e.target.value)}
                    placeholder="रिकामे ठेवल्यास पासवर्ड बदलणार नाही"
                    className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-3 py-2 pr-10 text-zinc-100 font-mono focus:outline-none focus:border-[#FF5A1F] transition placeholder:font-sans placeholder:tracking-normal"
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPass(!showEditPass)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                  >
                    {showEditPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {editWorkerPassword && editWorkerPassword.length < 4 && (
                  <p className="text-[10px] text-red-400 mt-0.5">किमान ४ अक्षरे आवश्यक</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={editWorkerSaving}
                className="w-full py-2.5 rounded-xl bg-[#FF5A1F] text-white font-bold hover:bg-[#E04C00] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {editWorkerSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    बदल जतन करा
                  </>
                )}
              </button>

              {editingWorker.mobile && (
                <button
                  type="button"
                  onClick={() => handleShareWorkerWhatsApp(
                    { ...editingWorker, name: editWorkerName, role: editWorkerRole, mobile: editWorkerMobile },
                    editWorkerPassword.trim() || null
                  )}
                  className="w-full py-2.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/25 transition flex items-center justify-center gap-1.5"
                >
                  <Share2 size={14} />
                  WhatsApp वर लॉगिन लिंक व माहिती पाठवा
                </button>
              )}

              {user?.role === 'Admin' && editingWorker._id !== user?._id && (
                <div className="pt-2 border-t border-[#242731]">
                  <button
                    type="button"
                    onClick={() => handleDeleteWorker(editingWorker)}
                    className="w-full py-2.5 rounded-xl bg-[#29171b] border border-[#482025] text-red-400 text-xs font-bold hover:bg-[#3d1c21] hover:text-red-300 transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>कार्यकर्ता खाते कायमचे हटवा (Delete User)</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
