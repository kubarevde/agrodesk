import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AgroLogo } from '@/components/layout/AgroLogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin } from '@/features/auth/hooks'
import { loginSchema, type LoginFormValues } from '@/features/auth/loginSchema'

export function LoginPage() {
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeCode: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login.mutateAsync(values)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error('Неверный код или пароль')
      }
    }
  }

  const isLoading = isSubmitting || login.isPending

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex flex-col items-center gap-2 [&_span]:text-[#01696F] [&_svg]:text-[#01696F]">
            <AgroLogo showText />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Вход в систему</h1>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="employeeCode">Код сотрудника</Label>
              <Input
                id="employeeCode"
                placeholder="EMP001"
                autoComplete="username"
                {...register('employeeCode')}
              />
              {errors.employeeCode ? (
                <p className="text-sm text-destructive">{errors.employeeCode.message}</p>
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
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Войти'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Забыли пароль? Обратитесь к администратору
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
