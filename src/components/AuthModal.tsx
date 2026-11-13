import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import type { Language, User, UserRole } from '../shared/types.ts';
import { UI_TEXT } from '../shared/i18n.ts';

interface AuthModalProps {
  lang: Language;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}

export function AuthModal({ lang, initialMode = 'login', onClose, onAuthenticated }: AuthModalProps) {
  const t = UI_TEXT[lang];
  const { users, loginMockUser, registerMockUser, switchDemoRole, showToast } = useMarketplace();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('customer@masidy.com');
  const [password, setPassword] = useState('masidy123');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [sellerDisplayName, setSellerDisplayName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setError(
        lang === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح.'
          : 'Please enter a valid email address.'
      );
      return;
    }

    if (password.trim().length < 6) {
      setError(
        lang === 'ar'
          ? 'يجب أن تتكون كلمة المرور التجريبية من 6 أحرف على الأقل.'
          : 'Demo password must be at least 6 characters.'
      );
      return;
    }

    if (mode === 'login') {
      const user = loginMockUser(trimmedEmail);
      if (!user) {
        setError(
          lang === 'ar'
            ? 'البريد غير موجود في البيانات التجريبية. جرب customer@masidy.com أو استخدم التبديل السريع.'
            : 'Mock email not found. Try customer@masidy.com or use Quick Role Switch.'
        );
        return;
      }
      if (user.status === 'suspended') {
        setError(
          lang === 'ar'
            ? 'هذا الحساب موقوف مؤقتًا من قبل الإدارة.'
            : 'This demo account is currently suspended by administration.'
        );
        return;
      }
      showToast(
        lang === 'ar' ? `مرحبًا بعودتك، ${user.name}` : `Signed in as ${user.name}`,
        'success'
      );
      onAuthenticated(user);
      onClose();
      return;
    }

    if (name.trim().length < 2) {
      setError(
        lang === 'ar'
          ? 'يرجى إدخال الاسم الكامل (حرفين على الأقل).'
          : 'Please enter your full name (at least 2 characters).'
      );
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      setError(
        lang === 'ar'
          ? 'هذا البريد الإلكتروني مسجل مسبقًا، يمكنك تسجيل الدخول مباشرة.'
          : 'This email is already registered. Switch to Sign In instead.'
      );
      return;
    }

    if (role === 'provider' && companyName.trim().length < 2) {
      setError(
        lang === 'ar'
          ? 'يرجى إدخال اسم الشركة السياحية لإكمال التسجيل المجاني.'
          : 'Please enter your travel company name to complete free registration.'
      );
      return;
    }

    const user = registerMockUser({
      name: name.trim(),
      email: trimmedEmail,
      phone: phone.trim(),
      role,
      companyName: companyName.trim(),
      companyCity: companyCity.trim(),
      companyCountry: companyCountry.trim(),
      sellerDisplayName: sellerDisplayName.trim(),
    });
    showToast(
      lang === 'ar' ? `تم إنشاء الحساب التجريبي: ${user.name}` : `Demo account created: ${user.name}`,
      'success'
    );
    onAuthenticated(user);
    onClose();
  }

  function handleDemoSwitch(demoRole: UserRole) {
    const user = switchDemoRole(demoRole);
    showToast(
      lang === 'ar' ? `تم التبديل إلى حساب ${user.name}` : `Switched demo session to ${user.name}`,
      'info'
    );
    onAuthenticated(user);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === 'login' ? t.loginTab : t.registerTab}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.loginTab}
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.registerTab}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'نوع الحساب' : lang === 'it' ? 'Tipo Account' : 'Account Role'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['customer', 'provider', 'seller'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        role === r
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {r === 'customer'
                        ? t.roleCustomer
                        : r === 'provider'
                        ? t.roleProvider
                        : t.roleSeller}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>

              {role === 'provider' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={lang === 'ar' ? 'اسم الشركة (مجانًا)' : 'Company Name (Free)'}
                    className="sm:col-span-3 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={companyCity}
                    onChange={(e) => setCompanyCity(e.target.value)}
                    placeholder={lang === 'ar' ? 'المدينة' : 'City'}
                    className="sm:col-span-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={companyCountry}
                    onChange={(e) => setCompanyCountry(e.target.value)}
                    placeholder={lang === 'ar' ? 'الدولة' : 'Country'}
                    className="sm:col-span-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {role === 'seller' && (
                <input
                  type="text"
                  value={sellerDisplayName}
                  onChange={(e) => setSellerDisplayName(e.target.value)}
                  placeholder={lang === 'ar' ? 'الاسم التجاري للمسوق / البائع' : 'Affiliate Brand Name'}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              )}
            </>
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          />

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-[#F95738] hover:bg-[#e1482b] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {mode === 'login' ? t.loginTab : t.registerTab}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 mb-2">{t.switchDemoRole}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['customer', 'provider', 'seller', 'admin'] as UserRole[]).map((demoRole) => (
              <button
                key={demoRole}
                type="button"
                onClick={() => handleDemoSwitch(demoRole)}
                className="py-2 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                {demoRole === 'customer'
                  ? t.roleCustomer
                  : demoRole === 'provider'
                  ? t.roleProvider
                  : demoRole === 'seller'
                  ? t.roleSeller
                  : t.roleAdmin}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
