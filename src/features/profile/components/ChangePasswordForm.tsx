import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChangePassword } from '@/features/auth/hooks'
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/profile/schemas'

export function ChangePasswordForm() {
  const changePassword = useChangePassword()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const pending = isSubmitting || changePassword.isPending

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      toast.success('Пароль изменён')
      reset()
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        toast.error('Неверный текущий пароль')
        return
      }
      toast.error('Не удалось сменить пароль')
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold text-foreground">Смена пароля</h2>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Текущий пароль</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...register('currentPassword')}
          />
          {errors.currentPassword ? (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Новый пароль</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
          />
          {errors.newPassword ? (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Повторите пароль</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Сменить пароль
        </Button>
      </form>
    </section>
  )
}
