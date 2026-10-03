import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Phone, User, Eye, EyeOff, LogIn, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export const LoginView = () => {
  const { login, language, toggleLanguage, activeFestival } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage(language === 'mr' ? 'कृपया मोबाईल नंबर किंवा ईमेल टाका' : 'Please enter mobile number or email');
      return;
    }
    if (!password) {
      setErrorMessage(language === 'mr' ? 'कृपया पासवर्ड टाका' : 'Please enter password');
      return;
    }

    setSubmitting(true);
    const result = await login(identifier.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || (language === 'mr' ? 'चुकीचा मोबाईल/ईमेल किंवा पासवर्ड' : 'Invalid credentials'));
    }
  };

  const handleQuickLogin = (id, pass) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#eaeaea] flex flex-col justify-between p-4 sm:p-6 selection:bg-[#FF5A1F] selection:text-white">
      {/* Top Language Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5 text-xs text-orange-400/90 font-bold">
          <ShieldCheck size={16} className="text-[#FF5A1F]" />
          <span>अधिकृत प्रवेश पोर्टल</span>
        </div>

        <button
          onClick={toggleLanguage}
          type="button"
          className="px-3 py-1 rounded-full text-xs font-bold border border-[#2b2e38] bg-[#16181e] text-zinc-300 hover:text-white transition"
        >
          {language === 'mr' ? 'ENG' : 'मराठी'}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-[#14161b] border border-[#262933] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FF5A1F]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#2DD4BF]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Mandal Brand & Logo Header */}
          <div className="text-center flex flex-col items-center mb-6 relative">
            <div className="relative mb-3">
              <img
                src="/mandal-logo.jpg"
                alt="ज्योती नवरात्र तरुण मंडळ लोगो"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-orange-500 shadow-xl shadow-orange-950/60"
              />
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#14161b] flex items-center justify-center text-white shadow">
                <CheckCircle2 size={13} strokeWidth={3} />
              </span>
            </div>

            <span className="inline-block px-3 py-0.5 rounded-full bg-orange-950/60 border border-orange-700/60 text-orange-300 text-[10.5px] font-bold tracking-wider uppercase mb-1">
              रजि. नं: {activeFestival?.registrationNo || 'महा./६१३/सोलापूर'}
            </span>

            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 leading-snug">
              {activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ'}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {language === 'mr' ? 'वर्गणी, पावत्या व ताळेबंद सुरक्षित व्यवस्थापन' : 'Vargani, Receipts & Balance Sheet System'}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-red-950/70 border border-red-800 text-red-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier (Mobile / Email) */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>{language === 'mr' ? 'मोबाईल नंबर किंवा ईमेल :' : 'Mobile or Email :'}</span>
                <span className="text-[11px] text-zinc-500 font-normal">उदा. 9876543210</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="मोबाईल क्र. किंवा ईमेल टाका..."
                  autoComplete="username"
                  className="w-full bg-[#1b1e25] border border-[#2c303c] rounded-2xl pl-10 pr-3.5 py-3 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F] transition placeholder:text-zinc-500 font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>{language === 'mr' ? 'पासवर्ड (Password) :' : 'Password :'}</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="आपला पासवर्ड टाका..."
                  autoComplete="current-password"
                  className="w-full bg-[#1b1e25] border border-[#2c303c] rounded-2xl pl-10 pr-11 py-3 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F] transition placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF5A1F] to-[#E04C00] hover:from-[#f05016] hover:to-[#cc4400] text-white font-extrabold text-sm shadow-xl shadow-orange-950/70 flex items-center justify-center gap-2 border border-orange-400/40 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>{language === 'mr' ? 'सुरक्षित लॉगिन करा' : 'Secure Login'}</span>
                </>
              )}
            </button>
          </form>
          
        </div>

        {/* Security Notice Footer */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1">
            <Lock size={12} className="text-zinc-500" />
            <span>256-bit Secure JWT Authentication • केवळ अधिकृत कार्यकर्त्यांसाठी</span>
          </p>
          <p className="text-[10.5px] text-zinc-600">
            येथे झालेला प्रत्येक बदल अधिकृत ऑडीट ट्रेलसह नोंदवला जातो
          </p>
        </div>
      </div>

      <div className="w-full text-center py-2 text-[11px] text-zinc-600">
        © २०२६ {activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर'}
      </div>
    </div>
  );
};
