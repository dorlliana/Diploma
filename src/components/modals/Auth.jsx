import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth';

const Auth = () => {
  const { login, register, error } = useAuth();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegister, setIsRegister]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [localError, setLocalError]     = useState('');

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (isRegister && password !== confirmPassword) {
      setLocalError('Паролі не збігаються');
      return;
    }
    setLocalError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch {
      // помилка вже зберігається в useAuth
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const displayError = localError || error;

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo-row">
          <div>
            <h1 className="auth-logo-title">GameDev Tracker</h1>
            <p className="auth-logo-sub">Організуй свій проєкт в одному місці</p>
          </div>
        </div>

        <div className="auth-tab-row">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? 'auth-tab--active' : ''}`}
            onClick={() => { setIsRegister(false); setLocalError(''); }}
          >
            Увійти
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? 'auth-tab--active' : ''}`}
            onClick={() => { setIsRegister(true); setLocalError(''); }}
          >
            Реєстрація
          </button>
        </div>

        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">Пароль</label>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              placeholder={isRegister ? 'Мінімум 6 символів' : '••••••••'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
              onKeyDown={handleKeyDown}
            />
          </div>

          {isRegister && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-confirm-password">Підтвердження пароля</label>
              <input
                id="auth-confirm-password"
                className={`auth-input ${localError === 'Паролі не збігаються' ? 'auth-input--error' : ''}`}
                type="password"
                placeholder="Повторіть пароль"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(''); }}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          {displayError && (
            <div className="auth-error">! {displayError}</div>
          )}

          <button
            type="button"
            className="auth-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Завантаження...' : isRegister ? 'Створити акаунт' : 'Увійти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;