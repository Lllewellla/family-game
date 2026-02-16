const API = {
  baseURL: window.BACKEND_URL || '',
  async request(path, options = {}) {
    const initData = window.Telegram?.WebApp?.initData || '';
    const res = await fetch(this.baseURL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      let msg = data.detail || res.statusText;
      if (res.status === 401) msg = 'Откройте приложение из Telegram (бот → кнопка «Открыть Трекер»).';
      throw new Error(msg);
    }
    return data;
  },
  get(path) { return this.request(path, { method: 'GET' }); },
  post(path, body) { return this.request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); },
  put(path, body) { return this.request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }); },
  delete(path) { return this.request(path, { method: 'DELETE' }); },
};
