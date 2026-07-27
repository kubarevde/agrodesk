import { useState } from 'react'
import { WifiOff } from 'lucide-react'
import { AgroLogo } from '@/components/layout/AgroLogo'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LoginForm } from '@/features/auth/LoginForm'
import { OrgSelector } from '@/features/auth/OrgSelector'
import {
  getSelectedOrg,
  setSelectedOrg,
  type SelectedOrg,
} from '@/features/auth/selectedOrg'
import { loginHelp } from '@/features/help/content'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function LoginPage() {
  const saved = getSelectedOrg()
  const [step, setStep] = useState<1 | 2>(saved ? 2 : 1)
  const [org, setOrg] = useState<SelectedOrg | null>(saved)
  const isOnline = useOnlineStatus()

  const handleSelectOrg = (next: SelectedOrg) => {
    setOrg(next)
  }

  const handleContinue = () => {
    if (!org) return
    setSelectedOrg(org)
    setStep(2)
  }

  const handleChangeOrg = () => {
    setOrg(null)
    setSelectedOrg(null)
    setStep(1)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex flex-col items-center gap-2 [&_span]:text-primary [&_svg]:text-primary">
            <AgroLogo showText />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {step === 1 ? 'Выбор организации' : 'Вход в систему'}
          </h1>
        </CardHeader>
        <CardContent>
          {!isOnline ? (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/60 p-3 text-left text-sm"
            >
              <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <p className="font-medium text-foreground">Нет сети</p>
                <p className="text-xs text-muted-foreground">
                  Первый вход без интернета невозможен. Откройте приложение онлайн, войдите и
                  установите на главный экран — после этого shell откроется офлайн.
                </p>
              </div>
            </div>
          ) : null}
          {step === 1 ? (
            <OrgSelector
              value={org}
              onChange={handleSelectOrg}
              onContinue={handleContinue}
            />
          ) : org ? (
            <LoginForm org={org} onChangeOrg={handleChangeOrg} />
          ) : null}
          {step === 2 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Забыли пароль? Обратитесь к администратору
            </p>
          ) : null}
          <div className="mt-6">
            <SectionHelp title="Справка по входу" items={loginHelp} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
