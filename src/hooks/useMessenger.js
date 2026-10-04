import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { deleteNotification, receiveNotification, sendMessage } from '../api.js';

const STORAGE_KEY = 'tg-chat-state';
const TEXT_TYPES = ['textMessage', 'extendedTextMessage'];
const WEBHOOKS = ['incomingMessageReceived', 'outgoingMessageReceived', 'outgoingAPIMessageReceived'];

function load(instanceId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (saved?.instanceId === instanceId) return saved;
  } catch {
  }
  return { instanceId, chats: {}, activeId: null };
}

function reducer(state, action) {
  switch (action.type) {
    case 'OPEN_CHAT': {
      const { id, name, phone } = action;
      const chat = state.chats[id] ?? { id, name, phone, messages: [], unread: 0, updatedAt: Date.now() };
      return { ...state, activeId: id, chats: { ...state.chats, [id]: { ...chat, unread: 0 } } };
    }
    case 'SELECT': {
      const chat = state.chats[action.id];
      return {
        ...state,
        activeId: action.id,
        chats: chat ? { ...state.chats, [action.id]: { ...chat, unread: 0 } } : state.chats,
      };
    }
    case 'ADD_MESSAGE': {
      const { chatId, name, message } = action;
      const chat = state.chats[chatId] ?? {
        id: chatId,
        name: name || chatId,
        messages: [],
        unread: 0,
        updatedAt: message.time,
      };
      if (chat.messages.some((m) => m.id === message.id)) return state;
      const unread = !message.out && state.activeId !== chatId ? chat.unread + 1 : chat.unread;
      return {
        ...state,
        chats: {
          ...state.chats,
          [chatId]: { ...chat, messages: [...chat.messages, message], unread, updatedAt: message.time },
        },
      };
    }
    case 'MESSAGE_SENT': {
      const { chatId, tempId, id } = action;
      const chat = state.chats[chatId];
      if (!chat) return state;
      const messages = chat.messages.some((m) => m.id === id)
        ? chat.messages.filter((m) => m.id !== tempId)
        : chat.messages.map((m) => (m.id === tempId ? { ...m, id, status: 'sent' } : m));
      return { ...state, chats: { ...state.chats, [chatId]: { ...chat, messages } } };
    }
    case 'MESSAGE_STATUS': {
      const { chatId, id, status } = action;
      const chat = state.chats[chatId];
      if (!chat) return state;
      const messages = chat.messages.map((m) => (m.id === id ? { ...m, status } : m));
      return { ...state, chats: { ...state.chats, [chatId]: { ...chat, messages } } };
    }
    default:
      return state;
  }
}

function parseNotification(body) {
  if (!body || !WEBHOOKS.includes(body.typeWebhook)) return null;
  const md = body.messageData;
  if (!md || !TEXT_TYPES.includes(md.typeMessage)) return null;
  const text = md.textMessageData?.textMessage ?? md.extendedTextMessageData?.text ?? md.textMessage;
  const chatId = String(body.senderData?.chatId ?? '');
  if (!text || !chatId || chatId.startsWith('-')) return null;
  return {
    chatId,
    name: body.senderData?.chatName || body.senderData?.senderName,
    message: {
      id: body.idMessage,
      text,
      out: body.typeWebhook !== 'incomingMessageReceived',
      time: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
      status: 'sent',
    },
  };
}

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true }
    );
  });

export function useMessenger(creds) {
  const [state, dispatch] = useReducer(reducer, creds.idInstance, load);
  const [connection, setConnection] = useState('connecting');
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const ctrl = new AbortController();
    const { signal } = ctrl;

    (async () => {
      let failures = 0;
      while (!signal.aborted) {
        const startedAt = Date.now();
        try {
          const notification = await receiveNotification(creds, signal);
          failures = 0;
          setConnection('online');
          if (notification) {
            const parsed = parseNotification(notification.body);
            if (parsed) dispatch({ type: 'ADD_MESSAGE', ...parsed });
            await deleteNotification(creds, notification.receiptId, signal);
          } else if (Date.now() - startedAt < 1000) {
            await sleep(1000, signal);
          }
        } catch {
          if (signal.aborted) return;
          failures += 1;
          setConnection('offline');
          await sleep(Math.min(2000 * 2 ** (failures - 1), 30000), signal);
        }
      }
    })();

    return () => ctrl.abort();
  }, [creds]);

  const openChat = useCallback((chat) => dispatch({ type: 'OPEN_CHAT', ...chat }), []);
  const selectChat = useCallback((id) => dispatch({ type: 'SELECT', id }), []);

  const deliver = useCallback(
    async (chatId, tempId, text) => {
      try {
        const res = await sendMessage(creds, chatId, text);
        dispatch({ type: 'MESSAGE_SENT', chatId, tempId, id: res?.idMessage ?? tempId });
      } catch {
        dispatch({ type: 'MESSAGE_STATUS', chatId, id: tempId, status: 'error' });
      }
    },
    [creds]
  );

  const send = useCallback(
    (chatId, text) => {
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      dispatch({
        type: 'ADD_MESSAGE',
        chatId,
        message: { id: tempId, text, out: true, time: Date.now(), status: 'sending' },
      });
      deliver(chatId, tempId, text);
    },
    [deliver]
  );

  const retry = useCallback(
    (chatId, message) => {
      dispatch({ type: 'MESSAGE_STATUS', chatId, id: message.id, status: 'sending' });
      deliver(chatId, message.id, message.text);
    },
    [deliver]
  );

  return { state, connection, openChat, selectChat, send, retry };
}
