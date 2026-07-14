import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { currentUserFromApi } from '@/lib/transformers'
import {
  fetchCurrentUser,
  getHomeRoute,
  TOKEN_KEY,
} from '@/features/auth/utils'

interface LoginCredentials {
  employeeCode: string
  password: string
}

interface LoginResponse {
  access_token: string
  employee: Record<string, unknown>
}

export { TOKEN_KEY, fetchCurrentUser, getHomeRoute }

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 300_000,
    enabled: Boolean(localStorage.getItem(TOKEN_KEY)),
  })
}

export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await api.post<LoginResponse>('/api/auth/login', {
        employee_code: credentials.employeeCode,
        password: credentials.password,
      })
      return data
    },
    onSuccess: (data) => {
      localStorage.setItem(TOKEN_KEY, data.access_token)
      const user = currentUserFromApi(data.employee)
      queryClient.setQueryData(['auth', 'me'], user)
      void navigate({ to: getHomeRoute(user.role) })
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return () => {
    localStorage.removeItem(TOKEN_KEY)
    queryClient.clear()
    void navigate({ to: '/login' })
  }
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      await api.post('/api/auth/change-password', {
        current_password: payload.currentPassword,
        new_password: payload.newPassword,
      })
    },
  })
}
