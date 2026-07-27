import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function TelegramSection() {
  return (
    <section id="telegram" className="scroll-mt-24 border-b border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
        <div>
          <p className="landing-kicker text-[11px] text-primary">Telegram</p>
          <h2 className="landing-display mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
            Смена в поле — без браузера
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Когда связи мало или неудобно открывать веб, сотрудник отмечает начало и конец
            работы в боте. Запись попадает в те же смены, что и в приложении.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-foreground">
            <li className="border-l-2 border-primary pl-4">Старт и завершение смены</li>
            <li className="border-l-2 border-primary pl-4">Объект, тип работ и поле при необходимости</li>
            <li className="border-l-2 border-primary pl-4">Синхронизация с разделом «Рабочее время»</li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
          <div className="rotate-1 border border-border bg-background p-5 shadow-sm dark:shadow-none">
            <p className="landing-kicker text-[10px] text-muted-foreground">Сценарий дня</p>
            <ol className="mt-5 space-y-5 text-sm">
              <li>
                <span className="font-semibold text-foreground">Утро.</span>{' '}
                <span className="text-muted-foreground">
                  «Начал работу» в боте или в «Моя смена».
                </span>
              </li>
              <li>
                <span className="font-semibold text-foreground">День.</span>{' '}
                <span className="text-muted-foreground">
                  Менеджер видит открытые смены в разделе смен.
                </span>
              </li>
              <li>
                <span className="font-semibold text-foreground">Вечер.</span>{' '}
                <span className="text-muted-foreground">
                  Смена закрывается — часы идут в начисление и отчёты.
                </span>
              </li>
            </ol>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'mt-7 w-full justify-center',
              )}
            >
              Войти в систему
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
