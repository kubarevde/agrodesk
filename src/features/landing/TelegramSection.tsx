import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DAY_PARTS = [
  {
    label: 'Утро',
    text: '«Начал работу» в боте или в «Моя смена».',
  },
  {
    label: 'День',
    text: 'Менеджер видит открытые смены в разделе смен.',
  },
  {
    label: 'Вечер',
    text: 'Смена закрывается — часы идут в начисление и отчёты.',
  },
] as const

export function TelegramSection() {
  return (
    <section id="telegram" className="scroll-mt-24 border-b border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
        <div>
          <p className="landing-kicker text-[11px] text-primary">Telegram</p>
          <h2 className="landing-display mt-3 text-balance text-3xl font-semibold text-foreground sm:text-4xl">
            Смена в поле — без браузера
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Когда связи мало или неудобно открывать веб, сотрудник отмечает начало и конец
            работы в боте. Запись попадает в те же смены, что и в приложении.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-foreground">
            <li className="border-l-2 border-primary pl-4 leading-relaxed">
              Старт и завершение смены
            </li>
            <li className="border-l-2 border-primary pl-4 leading-relaxed">
              Объект, тип работ и поле при необходимости
            </li>
            <li className="border-l-2 border-primary pl-4 leading-relaxed">
              Синхронизация с разделом «Рабочее время»
            </li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end">
          <div className="rotate-1 border border-border bg-background p-5 shadow-sm sm:p-6 dark:shadow-none">
            <p className="landing-kicker text-[10px] text-muted-foreground">Сценарий дня</p>
            <ol className="mt-5 space-y-5">
              {DAY_PARTS.map((part) => (
                <li key={part.label} className="grid grid-cols-[4.25rem_1fr] gap-3">
                  <span className="landing-display text-lg font-semibold text-primary">
                    {part.label}
                  </span>
                  <span className="pt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {part.text}
                  </span>
                </li>
              ))}
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
