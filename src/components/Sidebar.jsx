import { useState } from 'react';
import { checkAccount } from '../api.js';

const initials = (name = '?') => name.trim().slice(0, 1).toUpperCase() || '?';
const fmtTime = (t) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function parseRecipient(raw) {
  const value = raw.trim();
  if (value.startsWith('@')) {
    return /^@[A-Za-z0-9_]{5,32}$/.test(value) ? { username: value } : null;
  }
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  return digits.length >= 7 && digits.length <= 15 ? { phone: digits } : null;
}

export default function Sidebar({ creds, chats, activeId, connection, onSelect, onOpen, onLogout }) {
  const [creating, setCreating] = useState(chats.length === 0);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e) {
    e.preventDefault();
    const recipient = parseRecipient(value);
    if (!recipient) {
      return setError('Введите номер в международном формате (например, 79991234567) или @username');
    }

    setBusy(true);
    setError('');
    try {
      const res = await checkAccount(creds, recipient);
      if (!res?.chatId) {
        setError('Аккаунт Telegram не найден. Если номер скрыт настройками приватности, попробуйте @username.');
        return;
      }
      onOpen({
        id: String(res.chatId),
        name: recipient.username ?? `+${recipient.phone}`,
        phone: recipient.phone,
      });
      setValue('');
      setCreating(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const connectionLabel =
    connection === 'online' ? 'на связи' : connection === 'offline' ? 'нет связи' : 'подключение…';

  return (
    <aside className="sidebar">
      <header className="sidebar-head">
        <div>
          <strong>Чаты</strong>
          <span className={`conn ${connection}`}>{connectionLabel}</span>
        </div>
        <div className="head-actions">
          <button className="icon" onClick={() => setCreating((v) => !v)} aria-label="Новый чат" title="Новый чат">
            ✎
          </button>
          <button className="icon" onClick={onLogout} aria-label="Выйти" title="Выйти">
            ⏻
          </button>
        </div>
      </header>

      {creating && (
        <form className="new-chat" onSubmit={create}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Номер телефона или @username"
            aria-label="Номер телефона получателя"
            autoFocus
          />
          <button className="primary" disabled={busy}>
            {busy ? 'Ищем…' : 'Создать чат'}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      <ul className="chat-list">
        {chats.length === 0 && !creating && <li className="empty">Чатов пока нет. Нажмите ✎, чтобы начать.</li>}
        {chats.map((chat) => {
          const last = chat.messages[chat.messages.length - 1];
          return (
            <li key={chat.id}>
              <button
                className={`chat-item ${chat.id === activeId ? 'active' : ''}`}
                onClick={() => onSelect(chat.id)}
              >
                <span className="avatar">{initials(chat.name)}</span>
                <span className="chat-main">
                  <span className="chat-row">
                    <b>{chat.name}</b>
                    {last && <time>{fmtTime(last.time)}</time>}
                  </span>
                  <span className="chat-row">
                    <span className="preview">{last ? `${last.out ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}</span>
                    {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
