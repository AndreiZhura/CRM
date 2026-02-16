// src/services/api.js

// Базовый URL бэкенда. В разработке он на localhost:8000.
// Если будем деплоить через nginx, здесь может быть относительный путь '/api'.
const BASE_URL = 'http://localhost:8000';

// Функция для выполнения запросов с учётом авторизации
async function apiFetch(endpoint, options = {}) {
  // Формируем полный URL
  const url = `${BASE_URL}${endpoint}`;

  // По умолчанию указываем заголовки для JSON
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Если в localStorage есть токен, добавляем его в заголовок Authorization
  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Выполняем fetch
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Если ответ не успешный (код не 2xx), бросаем ошибку с текстом
  if (!response.ok) {
    let errorText = `Ошибка ${response.status}`;
    try {
      const errorData = await response.json();
      errorText = errorData.detail || errorText;
    } catch (e) {
      // игнорируем
    }
    throw new Error(errorText);
  }

  // Если ответ пустой (204), возвращаем null, иначе JSON
  if (response.status === 204) {
    return null;
  }
  return await response.json();
}

// Методы для работы с API
const api = {
  // Авторизация
  login: (username, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Регистрация (пока не нужна, но добавим для полноты)
  register: (username, password) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Получить информацию о текущем пользователе
  getMe: () => apiFetch('/auth/me'),

  // Примеры для других сущностей (добавим позже)
  getInstallers: () => apiFetch('/installers/'),
  getInstaller: (id) => apiFetch(`/installers/${id}`),
  createInstaller: (data) => apiFetch('/installers/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteInstaller: (id) => apiFetch(`/installers/${id}`, {
    method: 'DELETE',
  }),
  getOrders: () => apiFetch('/orders/'),
  getOrder: (id) => apiFetch(`/orders/${id}`),
  updateOrder: (id, data) => apiFetch(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteOrder: (id) => apiFetch(`/orders/${id}`, {
    method: 'DELETE',
  }),
  getClients: () => apiFetch('/clients/')
};


export default api;