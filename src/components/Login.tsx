import React, { useState } from 'react';
import { ApiError, defaultApiUrl, getStateInstance, Creds } from '../api';

export interface LoginProps {
  onLogin: (creds: Creds) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [idInstance, setId] = useState('');
  const [apiTokenInstance, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = idInstance.trim();
    const token = apiTokenInstance.trim();
    if (!/^\d{4,}$/.test(id)) return setError('idInstance — это число из личного кабинета GREEN-API');
    if (!token) return setError('Введите apiTokenInstance');

    const creds: Creds = {
      idInstance: id,
      apiTokenInstance: token,
      apiUrl: (apiUrl.trim() || defaultApiUrl(id)).replace(/\/+$/, ''),
    };
    setBusy(true);
    setError('');
    try {
      const res = await getStateInstance(creds);
      if (res?.stateInstance !== 'authorized') {
        throw new ApiError(
          'Инстанс не авторизован. Отсканируйте QR-код приложением Telegram в личном кабинете GREEN-API.'
        );
      }
      onLogin(creds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor">
            <path d="M9.4 15.6 9.2 19c.4 0 .6-.2.8-.4l2-1.9 4.1 3c.8.4 1.3.2 1.5-.7l2.7-12.7c.3-1.1-.4-1.6-1.1-1.3L3.4 11c-1.1.4-1.1 1.1-.2 1.3l4.1 1.3 9.5-6c.4-.3.8-.1.5.2" />
          </svg>
        </div>
        <h1>Вход в чат</h1>
        <p className="hint">Данные Telegram-инстанса из личного кабинета GREEN-API</p>

        <label>
          idInstance
          <input value={idInstance} onChange={(e) => setId(e.target.value)} inputMode="numeric" autoFocus />
        </label>
        <label>
          apiTokenInstance
          <input
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
        </label>

        <details>
          <summary>Адрес API</summary>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder={idInstance.length >= 4 ? defaultApiUrl(idInstance) : 'https://4100.api.green-api.com'}
          />
          <p className="hint">Если в кабинете указан другой apiUrl — вставьте его сюда.</p>
        </details>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
