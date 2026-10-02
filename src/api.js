export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

export const defaultApiUrl = (idInstance) =>
  `https://${String(idInstance).trim().slice(0, 4)}.api.green-api.com`;

const HTTP_MESSAGES = {
  400: 'Некорректный запрос к GREEN-API',
  401: 'Неверный idInstance или apiTokenInstance',
  403: 'Неверный idInstance или apiTokenInstance',
  429: 'Слишком много запросов, попробуйте через пару секунд',
  466: 'Превышена квота тарифа GREEN-API',
};

async function request(creds, method, path, { body, query, signal, suffix } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const url = `${creds.apiUrl}/waInstance${creds.idInstance}/${path}/${creds.apiTokenInstance}${suffix ? `/${suffix}` : ''}${qs}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Нет связи с GREEN-API. Проверьте интернет и адрес API.');
  }

  if (!res.ok) {
    throw new ApiError(HTTP_MESSAGES[res.status] ?? `Ошибка GREEN-API (${res.status})`, res.status);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const getStateInstance = (creds) => request(creds, 'GET', 'getStateInstance');

export const checkAccount = (creds, { phone, username }) =>
  request(creds, 'POST', 'checkAccount', {
    body: username ? { username } : { phoneNumber: Number(phone) },
  });

export const sendMessage = (creds, chatId, message) =>
  request(creds, 'POST', 'sendMessage', { body: { chatId, message } });

export const receiveNotification = (creds, signal) =>
  request(creds, 'GET', 'receiveNotification', { query: { receiveTimeout: 20 }, signal });

export const deleteNotification = (creds, receiptId, signal) =>
  request(creds, 'DELETE', 'deleteNotification', { signal, suffix: receiptId });
