export const API_BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'linkpulse_token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* stockage indisponible */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* stockage indisponible */
    }
  },
};

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Impossible de joindre le serveur. Vérifiez votre connexion.');
  }

  if (res.status === 204) return null;
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const error = data?.error ?? {};
    if (res.status === 401 && token) onUnauthorized();
    // Pas de réponse JSON de l'API : backend arrêté (proxy Vite en 500/502) ou passerelle en erreur
    if (!data && res.status >= 500) {
      throw new ApiError(res.status, 'SERVER_UNAVAILABLE', "Le serveur ne répond pas. Réessayez dans un instant.");
    }
    throw new ApiError(
      res.status,
      error.code || 'ERROR',
      error.message || 'Une erreur est survenue',
      error.details
    );
  }
  // Une réponse 2xx non-JSON (ex. index.html servi par la réécriture SPA) signifie que
  // VITE_API_URL ne pointe pas vers l'API : on lève une erreur claire au lieu de planter plus loin.
  if (!data) {
    throw new ApiError(res.status, 'BAD_RESPONSE', "Réponse inattendue du serveur. L'API est-elle bien configurée ?");
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  put: (path, body = {}) => request(path, { method: 'PUT', body }),
  patch: (path, body = {}) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
