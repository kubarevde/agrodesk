import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSuperAdminLogin } from '@/features/superadmin/hooks'
import { loginSchema, type LoginFormValues } from '@/features/superadmin/schemas'

export function SuperAdminLoginPage() {
  const navigate = useNavigate()
  const login = useSuperAdminLogin()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login.mutateAsync(values)
      await navigate({ to: '/superadmin/dashboard' })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error('Неверный email или пароль')
        return
      }
      toast.error('Не удалось войти')
    }
  }

  const isLoading = isSubmitting || login.isPending

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <p className="text-2xl font-semibold text-primary">АгроДеск · Администрация</p>
          <h1 className="text-lg font-medium text-foreground">Вход суперадмина</h1>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="admin@agrodesk.ru"
                {...register('email')}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
