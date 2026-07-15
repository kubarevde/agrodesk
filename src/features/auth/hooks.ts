import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { currentUserFromApi } from '@/lib/transformers'
import {
  fetchCurrentUser,
  getHomeRoute,
  TOKEN_KEY,
} from '@/features/auth/utils'
import type { SelectedOrg } from '@/features/auth/selectedOrg'

interface LoginCredentials {
  email: string
  password: string
  orgId: string
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

export function usePublicOrgs() {
  return useQuery({
    queryKey: ['auth', 'orgs'],
    queryFn: async (): Promise<SelectedOrg[]> => {
      const { data } = await api.get<Array<{ id: string; name: string; slug: string }>>(
        '/api/auth/orgs',
        { timeout: 10_000 },
      )
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
      }))
    },
    staleTime: 60_000,
    retry: 1,
  })
}

export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await api.post<LoginResponse>('/api/auth/login', {
        email: credentials.email,
        password: credentials.password,
        org_id: credentials.orgId,
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
