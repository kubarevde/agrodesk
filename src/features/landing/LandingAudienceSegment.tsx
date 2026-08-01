import { Link } from '@tanstack/react-router'
import { Leaf, Tractor } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Audience fork at the top of the public landing — additive only.
 * Farm CTA keeps the existing /login path; eco CTA opens /market.
 * data-landing-segment attrs preserve hook points for future analytics.
 */
export function LandingAudienceSegment() {
  return (
    <section
      id="audience"
      className="border-b border-border bg-surface pt-[4.25rem] sm:pt-[4.5rem]"
      aria-label="Выбор сценария"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <p className="landing-kicker text-[11px] text-primary">Два сценария</p>
        <h2 className="landing-display mt-2 max-w-2xl text-balance text-2xl font-semibold text-foreground sm:text-3xl">
          Для кого вы здесь?
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Управление хозяйством и витрина экопродукции — разные аудитории. Выберите свой
          путь, не смешивая сценарии.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <Link
            to="/login"
            data-landing-segment="farm"
            data-landing-cta="login"
            className={cn(
              'group flex flex-col rounded-lg border border-border bg-background p-5 transition-colors',
              'hover:border-primary/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Tractor className="size-5" aria-hidden />
            </span>
            <span className="landing-display mt-4 text-xl font-semibold text-foreground">
              Управление хозяйством
            </span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Смены, склад, закупки и агрокалендарь для КФХ — вход в рабочий контур
              организации.
            </span>
            <span
              className={cn(
                buttonVariants({ size: 'sm' }),
                'mt-5 w-fit bg-primary text-primary-foreground group-hover:bg-primary-hover',
              )}
            >
              Войти в систему
            </span>
          </Link>

          <Link
            to="/market"
            data-landing-segment="eco"
            data-landing-cta="market"
            className={cn(
              'group flex flex-col rounded-lg border border-border bg-background p-5 transition-colors',
              'hover:border-primary/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Leaf className="size-5" aria-hidden />
            </span>
            <span className="landing-display mt-4 text-xl font-semibold text-foreground">
              Купить экопродукцию
            </span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Публичная витрина хозяйств: мёд, масло, урожай и другие эко-товары без входа
              в учёт КФХ.
            </span>
            <span
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-5 w-fit border-primary text-primary group-hover:bg-primary/5',
              )}
            >
              Открыть витрину
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
