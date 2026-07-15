import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin } from '@/features/auth/hooks'
import { loginSchema, type LoginFormValues } from '@/features/auth/loginSchema'
import type { SelectedOrg } from '@/features/auth/selectedOrg'

type LoginFormProps = {
  org: SelectedOrg
  onChangeOrg: () => void
}

export function LoginForm({ org, onChangeOrg }: LoginFormProps) {
  const login = useLogin()

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
      await login.mutateAsync({
        email: values.email,
        password: values.password,
        orgId: org.id,
      })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail
        if (typeof detail === 'string') {
          toast.error(detail)
          return
        }
      }
      toast.error('Неверный email или пароль')
    }
  }

  const isLoading = isSubmitting || login.isPending

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Организация: </span>
        <span className="font-medium text-foreground">{org.name}</span>
        <button
          type="button"
          className="ml-2 text-primary underline-offset-2 hover:underline"
          onClick={onChangeOrg}
        >
          Сменить
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="text"
          autoComplete="username"
          placeholder="email или код сотрудника"
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
  )
}
