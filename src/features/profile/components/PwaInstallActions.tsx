import { Download, Home, Monitor, Share, Smartphone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type GuideProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Step-by-step Add to Home Screen for iOS Safari (no beforeinstallprompt). */
export function IosInstallGuideDialog({ open, onOpenChange }: GuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Установка на iPhone / iPad</DialogTitle>
        </DialogHeader>
        <ol className="space-y-4 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Share className="size-4" aria-hidden />
            </span>
            <p>
              <span className="font-medium text-foreground">1. Кнопка «Поделиться»</span>
              <br />
              Внизу или вверху Safari нажмите квадрат со стрелкой вверх.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Home className="size-4" aria-hidden />
            </span>
            <p>
              <span className="font-medium text-foreground">2. «На экран „Домой“»</span>
              <br />
              Пролистайте список вниз и нажмите этот пункт.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="size-4" aria-hidden />
            </span>
            <p>
              <span className="font-medium text-foreground">3. «Добавить»</span>
              <br />
              Появится иконка АгроДеск. Открывайте только её, не вкладку Safari.
            </p>
          </li>
        </ol>
        <DialogFooter>
          <Button type="button" className="min-h-11 w-full" onClick={() => onOpenChange(false)}>
            Понятно
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type InstallButtonProps = {
  showNative: boolean
  showIosGuide: boolean
  isStandalone: boolean
  onNativeInstall: () => void
  onOpenIosGuide: () => void
}

export function PwaInstallActions({
  showNative,
  showIosGuide,
  isStandalone,
  onNativeInstall,
  onOpenIosGuide,
}: InstallButtonProps) {
  if (isStandalone) {
    return (
      <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-foreground">
        Уже установлено. Открывайте АгроДеск с иконки на рабочем столе / в меню Пуск / на экране
        «Домой».
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {showNative ? (
        <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={onNativeInstall}>
          <Download className="size-4" />
          Установить приложение
        </Button>
      ) : null}

      {showIosGuide ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={onOpenIosGuide}
        >
          <Smartphone className="size-4" />
          Показать шаги для iPhone
        </Button>
      ) : null}

      {!showNative && !showIosGuide ? (
        <div className="space-y-3 rounded-lg border border-border bg-background px-3 py-3 text-sm">
          <p className="font-medium text-foreground">На компьютере — сделайте так:</p>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>
              Посмотрите <span className="font-medium text-foreground">вверх</span>, на строку с
              адресом сайта.
            </li>
            <li className="flex flex-wrap items-center gap-x-1 gap-y-1">
              Нажмите значок
              <Monitor className="inline size-4 text-foreground" aria-hidden />
              или пункт «Установить». Если значка нет — три точки справа ⋮ → «Установить
              АгроДеск…».
            </li>
            <li>Подтвердите установку. Готово — приложение появится в меню Пуск.</li>
          </ol>
          <p className="text-muted-foreground">
            Файл скачивать не нужно. Это обычная установка сайта как приложения.
          </p>
        </div>
      ) : null}
    </div>
  )
}
