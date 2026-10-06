export interface Creds {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}

export interface RequestOptions {
  body?: any;
  query?: Record<string, string | number>;
  signal?: AbortSignal;
  suffix?: string | number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 0) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const defaultApiUrl = (idInstance: string | number): string =>
  `https://${String(idInstance).trim().slice(0, 4)}.api.green-api.com`;

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Некорректный запрос к GREEN-API',
  401: 'Неверный idInstance или apiTokenInstance',
  403: 'Неверный idInstance или apiTokenInstance',
  429: 'Слишком много запросов, попробуйте через пару секунд',
  466: 'Превышена квота тарифа GREEN-API',
};

async function request(
  creds: Creds,
  method: string,
  path: string,
  { body, query, signal, suffix }: RequestOptions = {}
): Promise<any> {
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`
    : '';
  const url = `${creds.apiUrl}/waInstance${creds.idInstance}/${path}/${creds.apiTokenInstance}${
    suffix ? `/${suffix}` : ''
  }${qs}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Нет связи с GREEN-API. Проверьте интернет и адрес API.');
  }

  if (!res.ok) {
    throw new ApiError(HTTP_MESSAGES[res.status] ?? `Ошибка GREEN-API (${res.status})`, res.status);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export interface StateInstanceResponse {
  stateInstance: string;
}

export interface CheckAccountParams {
  phone?: string;
  username?: string;
}

export interface CheckAccountResponse {
  exists?: boolean;
  chatId?: string;
}

export interface SendMessageResponse {
  idMessage?: string;
}

export interface NotificationResponse {
  receiptId: number;
  body: any;
}

export const getStateInstance = (creds: Creds): Promise<StateInstanceResponse> =>
  request(creds, 'GET', 'getStateInstance');

export const checkAccount = (
  creds: Creds,
  { phone, username }: CheckAccountParams
): Promise<CheckAccountResponse> =>
  request(creds, 'POST', 'checkAccount', {
    body: username ? { username } : { phoneNumber: Number(phone) },
  });

export const sendMessage = (
  creds: Creds,
  chatId: string,
  message: string
): Promise<SendMessageResponse> =>
  request(creds, 'POST', 'sendMessage', { body: { chatId, message } });

export const receiveNotification = (
  creds: Creds,
  signal?: AbortSignal
): Promise<NotificationResponse | null> =>
  request(creds, 'GET', 'receiveNotification', { query: { receiveTimeout: 20 }, signal });

export const deleteNotification = (
  creds: Creds,
  receiptId: number,
  signal?: AbortSignal
): Promise<any> =>
  request(creds, 'DELETE', 'deleteNotification', { signal, suffix: receiptId });
