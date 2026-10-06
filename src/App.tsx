import { useState } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import { useMessenger } from './hooks/useMessenger';
import { Creds } from './api';

const CREDS_KEY = 'tg-chat-creds';

function loadCreds(): Creds | null {
  try {
    const saved = sessionStorage.getItem(CREDS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

interface MessengerProps {
  creds: Creds;
  onLogout: () => void;
}

function Messenger({ creds, onLogout }: MessengerProps) {
  const { state, connection, openChat, selectChat, send, retry } = useMessenger(creds);
  const chats = Object.values(state.chats).sort((a, b) => b.updatedAt - a.updatedAt);
  const active = state.activeId ? state.chats[state.activeId] : null;

  return (
    <div className={`app ${active ? 'has-chat' : ''}`}>
      <Sidebar
        creds={creds}
        chats={chats}
        activeId={state.activeId}
        connection={connection}
        onSelect={selectChat}
        onOpen={openChat}
        onLogout={onLogout}
      />
      <ChatView chat={active} onSend={send} onRetry={retry} onBack={() => selectChat(null)} />
    </div>
  );
}

export default function App() {
  const [creds, setCreds] = useState<Creds | null>(loadCreds);

  const login = (c: Creds) => {
    sessionStorage.setItem(CREDS_KEY, JSON.stringify(c));
    setCreds(c);
  };
  const logout = () => {
    sessionStorage.removeItem(CREDS_KEY);
    sessionStorage.removeItem('tg-chat-state');
    setCreds(null);
  };

  return creds ? <Messenger creds={creds} onLogout={logout} /> : <Login onLogin={login} />;
}
