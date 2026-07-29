import { useState } from 'react'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { offlineVersionHelp } from '@/features/help/content'
import { IosInstallGuideDialog, PwaInstallActions } from './PwaInstallActions'

export function OfflineVersionSection() {
  const { install, ui } = usePwaInstall()
  const [iosGuideOpen, setIosGuideOpen] = useState(false)

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Офлайн версия</h2>
        <p className="text-sm text-muted-foreground">
          Чтобы работать без интернета, добавьте АгроДеск на устройство как приложение. Это не
          скачивание файла — одна кнопка в браузере, около минуты.
        </p>
      </div>

      <PwaInstallActions
        showNative={ui.showNativeInstallButton}
        showIosGuide={ui.showIosGuideButton}
        isStandalone={ui.isStandalone}
        onNativeInstall={() => void install()}
        onOpenIosGuide={() => setIosGuideOpen(true)}
      />

      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">После установки</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Открывайте только <span className="font-medium text-foreground">иконку АгроДеск</span>,
            не вкладку в браузере.
          </li>
          <li>
            Перед выездом один раз зайдите в «Моя смена»{' '}
            <span className="font-medium text-foreground">с интернетом</span> — подтянутся списки
            для открытия смены.
          </li>
          <li>
            Без сети: открытие и закрытие смены. Не работают: склад, отчёты, фото, поддержка.
          </li>
        </ol>
      </div>

      <SectionHelp section="офлайн версия" items={offlineVersionHelp} />

      <IosInstallGuideDialog open={iosGuideOpen} onOpenChange={setIosGuideOpen} />
    </section>
  )
}
