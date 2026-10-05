import { useState } from 'react';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatView from './components/ChatView.jsx';
import { useMessenger } from './hooks/useMessenger.js';

const CREDS_KEY = 'tg-chat-creds';

function loadCreds() {
  try {
    return JSON.parse(sessionStorage.getItem(CREDS_KEY));
  } catch {
    return null;
  }
}

function Messenger({ creds, onLogout }) {
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
  const [creds, setCreds] = useState(loadCreds);

  const login = (c) => {
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
