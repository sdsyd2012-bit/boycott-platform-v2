import axios from 'axios'

import { API_BASE_URL } from '../config/api.js'

const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function client() {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: getToken() ? { Authorization: `Token ${getToken()}` } : {},
  })
}

function unwrapError(error) {
  if (error.response?.data?.detail) return error.response.data.detail
  if (error.response?.data) {
    const messages = Object.entries(error.response.data)
      .map(([field, value]) => {
        const text = Array.isArray(value) ? value.join('، ') : String(value)
        return `${field}: ${text}`
      })
      .join(' · ')
    if (messages) return messages
  }
  if (error.response) return `خطأ من الخادم (${error.response.status})`
  return 'تعذّر الاتصال بالخادم. تأكد أنه يعمل.'
}

export async function login(username, password) {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/login/`, {
      username,
      password,
    })
    saveSession(data.token, data)
    return { ok: true, user: data }
  } catch (error) {
    return { ok: false, message: unwrapError(error) }
  }
}

export async function apiRequest(method, url, bodyOrParams) {
  try {
    const config = { method, url }
    if (method.toLowerCase() === 'get') {
      config.params = bodyOrParams
    } else {
      config.data = bodyOrParams
    }
    const { data } = await client().request(config)
    return { ok: true, data }
  } catch (error) {
    if (error.response?.status === 401) {
      clearSession()
      window.location.href = '/admin/login'
      return { ok: false, message: 'انتهت الجلسة. سجّل الدخول مجدداً.' }
    }
    return { ok: false, message: unwrapError(error) }
  }
}

export const adminApi = {
  dashboard: () => apiRequest('get', '/admin/dashboard/'),
  list: (resource) => apiRequest('get', `/admin/${resource}/`),
  create: (resource, body) => apiRequest('post', `/admin/${resource}/`, body),
  update: (resource, id, body) =>
    apiRequest('put', `/admin/${resource}/${id}/`, body),
  remove: (resource, id) => apiRequest('delete', `/admin/${resource}/${id}/`),
  discoveries: (params) => apiRequest('get', '/admin/discoveries/', params),
  approveDiscovery: (id) => apiRequest('post', `/admin/discoveries/${id}/approve/`),
  rejectDiscovery: (id) => apiRequest('post', `/admin/discoveries/${id}/reject/`),
}
