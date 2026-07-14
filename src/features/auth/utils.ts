import { api } from '@/lib/api'
import { currentUserFromApi, type CurrentUser } from '@/lib/transformers'

export const TOKEN_KEY = 'agrodesk_token'

export function getHomeRoute(role: CurrentUser['role']): '/dashboard' | '/my-shift' {
  return role === 'employee' ? '/my-shift' : '/dashboard'
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<Record<string, unknown>>('/api/auth/me')
  return currentUserFromApi(data)
}
