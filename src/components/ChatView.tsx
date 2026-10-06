import React, { useEffect, useRef, useState } from 'react';
import { Chat, Message } from '../hooks/useMessenger';

const MAX_LENGTH = 4096;
const fmtTime = (t: number) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export interface ChatViewProps {
  chat: Chat | null;
  onSend: (chatId: string, text: string) => void;
  onRetry: (chatId: string, message: Message) => void;
  onBack: () => void;
}

export default function ChatView({ chat, onSend, onRetry, onBack }: ChatViewProps) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chat?.id, chat?.messages.length]);

  if (!chat) {
    return (
      <section className="chat placeholder">
        <p>Выберите чат или создайте новый по номеру телефона</p>
      </section>
    );
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(chat.id, value);
    setText('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <section className="chat">
      <header className="chat-head">
        <button className="icon back" onClick={onBack} aria-label="К списку чатов">
          ‹
        </button>
        <span className="avatar">{(chat.name || '?').trim().slice(0, 1).toUpperCase()}</span>
        <strong>{chat.name}</strong>
      </header>

      <ol className="messages">
        {chat.messages.length === 0 && <li className="empty">Напишите первое сообщение</li>}
        {chat.messages.map((m) => (
          <li key={m.id} className={`bubble ${m.out ? 'out' : 'in'} ${m.status}`}>
            <span className="text">{m.text}</span>
            <span className="meta">
              {m.status === 'error' ? (
                <button className="retry" onClick={() => onRetry(chat.id, m)}>
                  Не отправлено · повторить
                </button>
              ) : (
                <>
                  <time>{fmtTime(m.time)}</time>
                  {m.out && (
                    <span aria-label={m.status === 'sending' ? 'Отправляется' : 'Отправлено'}>
                      {m.status === 'sending' ? '○' : '✓'}
                    </span>
                  )}
                </>
              )}
            </span>
          </li>
        ))}
        <li ref={endRef} aria-hidden="true" />
      </ol>

      <form className="composer" onSubmit={submit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder="Написать сообщение…"
          aria-label="Сообщение"
        />
        <button className="send" disabled={!text.trim()} aria-label="Отправить">
          ➤
        </button>
      </form>
    </section>
  );
}
