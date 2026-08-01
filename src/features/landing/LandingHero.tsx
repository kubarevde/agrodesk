import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { LANDING_IMAGES, scrollToSection } from '@/features/landing/nav'
import { cn } from '@/lib/utils'

/** Full-bleed hero: brand + one promise + CTA + dominant field photo. */
export function LandingHero() {
  return (
    <section
      id="landing-hero"
      className="relative isolate min-h-[min(92vh,52rem)] overflow-hidden bg-foreground text-primary-foreground"
    >      <img
        src={LANDING_IMAGES.hero}
        alt=""
        className="absolute inset-0 size-full object-cover object-[center_45%]"
        fetchPriority="high"
        decoding="async"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/58 to-foreground/25 dark:from-background/92 dark:via-background/62 dark:to-background/28"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-transparent to-foreground/10 dark:from-background/65"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[min(92vh,52rem)] max-w-6xl flex-col justify-end px-4 pb-12 pt-28 sm:pb-16 sm:pt-32 lg:justify-center lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl space-y-5 sm:max-w-2xl sm:space-y-6"
        >
          <p className="landing-display text-4xl font-semibold tracking-tight text-primary sm:text-5xl lg:text-6xl">
            АгроДеск
          </p>
          <h1 className="landing-display text-balance text-2xl font-semibold leading-[1.12] text-primary-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Учёт смен, склада и закупок для КФХ — без таблиц в чатах
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
            Сотрудник отмечает работу в приложении или Telegram. Менеджер видит день
            хозяйства. Администратор держит доступы и историю изменений.
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:pt-2">
            <Link
              to="/login"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'w-full justify-center bg-primary text-primary-foreground hover:bg-primary-hover sm:w-auto',
              )}
            >
              Войти в систему
            </Link>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'w-full justify-center border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto',
              )}
              onClick={() => scrollToSection('day')}
            >
              Как проходит день
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
