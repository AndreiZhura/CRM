// src/services/api.js

// Базовый URL бэкенда. В разработке он на localhost:8000.
// Если будем деплоить через nginx, здесь может быть относительный путь '/api'.
//const BASE_URL = '/api';
//const BASE_URL = 'http://localhost:8000';
const BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : '';

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
  // ----------------------------------------
  //  АВТОРИЗАЦИЯ
  // ----------------------------------------
  login: (username, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username, password) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => apiFetch('/auth/me'),

  // ----------------------------------------
  //  МОНТАЖНИКИ (installers)
  // ----------------------------------------
  getInstallers: () => apiFetch('/installers/'),
  getInstaller: (id) => apiFetch(`/installers/${id}`),
  createInstaller: (data) => apiFetch('/installers/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateInstaller: (id, data) => apiFetch(`/installers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteInstaller: (id) => apiFetch(`/installers/${id}`, {
    method: 'DELETE',
  }),

  // ----------------------------------------
  //  КЛИЕНТЫ (clients)
  // ----------------------------------------
  getClients: () => apiFetch('/clients/'),
  getClient: (id) => apiFetch(`/clients/${id}`),
  createClient: (data) => apiFetch('/clients/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateClient: (id, data) => apiFetch(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteClient: (id) => apiFetch(`/clients/${id}`, {
    method: 'DELETE',
  }),

  // ----------------------------------------
  //  ЗАКАЗЫ (orders)
  // ----------------------------------------
  getOrders: () => apiFetch('/orders/'),
  getOrder: (id) => apiFetch(`/orders/${id}`),
  createOrder: (data) => apiFetch('/orders/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateOrder: (id, data) => apiFetch(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteOrder: (id) => apiFetch(`/orders/${id}`, {
    method: 'DELETE',
  }),

  // ----------------------------------------
  //  ФИНАНСЫ (finance)
  // ----------------------------------------
  createFinance: (data) => apiFetch('/finance/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateFinance: (id, data) => apiFetch(`/finance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getFinanceSummary: () => apiFetch('/finance/summary'),
  getMonthlyFinance: () => apiFetch('/finance/monthly'),
  getFinanceByOrder: (orderId) => apiFetch(`/finance/order/${orderId}`),

  // ----------------------------------------
  //  ПОЗИЦИИ ЗАКАЗА (order_items)
  // ----------------------------------------
  getOrderItems: (orderId) => apiFetch(`/order-items/order/${orderId}`),
  getOrderItem: (id) => apiFetch(`/order-items/${id}`),
  createOrderItem: (data) => apiFetch('/order-items/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateOrderItem: (id, data) => apiFetch(`/order-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteOrderItem: (id) => apiFetch(`/order-items/${id}`, {
    method: 'DELETE',
  }),

  // ----------------------------------------
  //  МОНТАЖНИКИ В ЗАКАЗЕ (order_installers)
  // ----------------------------------------
  getOrderInstallers: (orderId) => apiFetch(`/order-installers/order/${orderId}`),
  getOrderInstaller: (id) => apiFetch(`/order-installers/${id}`),
  createOrderInstaller: (data) => apiFetch('/order-installers/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateOrderInstaller: (id, data) => apiFetch(`/order-installers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteOrderInstaller: (id) => apiFetch(`/order-installers/${id}`, {
    method: 'DELETE',
  }),

  // ----------------------------------------
  //  РАСХОДЫ ПО ЗАКАЗУ (order_expenses)
  // ----------------------------------------
  getOrderExpenses: (orderId) => apiFetch(`/order-expenses/order/${orderId}`),
  getOrderExpense: (id) => apiFetch(`/order-expenses/${id}`),
  createOrderExpense: (data) => apiFetch('/order-expenses/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateOrderExpense: (id, data) => apiFetch(`/order-expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteOrderExpense: (id) => apiFetch(`/order-expenses/${id}`, {
    method: 'DELETE',
  }),

  // ----------------------------------------
  //  ГАРАНТИЙНЫЕ СЛУЧАИ (warranty_claims)
  // ----------------------------------------
  getWarrantyClaimsByOrderItem: (orderItemId) => apiFetch(`/warranty-claims/order-item/${orderItemId}`),
  getWarrantyClaim: (id) => apiFetch(`/warranty-claims/${id}`),
  createWarrantyClaim: (data) => apiFetch('/warranty-claims/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateWarrantyClaim: (id, data) => apiFetch(`/warranty-claims/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteWarrantyClaim: (id) => apiFetch(`/warranty-claims/${id}`, {
    method: 'DELETE',
  }),

  // ----------------------------------------
  //  ПЛАТЕЖИ (payments)
  // ----------------------------------------
  getPaymentsByOrder: (orderId) => apiFetch(`/payments/order/${orderId}`),
  getPayment: (id) => apiFetch(`/payments/${id}`),
  createPayment: (data) => apiFetch('/payments/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePayment: (id, data) => apiFetch(`/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePayment: (id) => apiFetch(`/payments/${id}`, {
    method: 'DELETE',
  }),
};

export default api;