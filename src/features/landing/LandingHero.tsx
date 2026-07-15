import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { MockupBrowser } from '@/features/landing/MockupBrowser'
import { scrollToSection } from '@/features/landing/nav'
import { cn } from '@/lib/utils'

export function LandingHero() {
  return (
    <section className="bg-[var(--landing-section-alt)] py-16 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 md:flex-row md:items-center md:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full flex-1 space-y-6"
        >
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--landing-primary)]">
            АгроДеск
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--landing-text)] sm:text-4xl lg:text-5xl">
            Управление аграрным хозяйством — просто и прозрачно
          </h1>
          <p className="max-w-xl text-base text-[var(--landing-muted)] sm:text-lg">
            Учёт рабочего времени, склад, зарплата и Telegram-бот в одной системе.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/login"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'w-full justify-center bg-[var(--landing-primary)] text-white hover:bg-green-700 sm:w-auto',
              )}
            >
              Начать бесплатно
            </Link>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'w-full justify-center border-green-200 text-[var(--landing-text)] sm:w-auto',
              )}
              onClick={() => scrollToSection('how')}
            >
              Смотреть как работает
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="w-full flex-1"
        >
          <MockupBrowser
            src="/screenshots/dashboard.png"
            alt="Дашборд АгроДеск"
            placeholderLabel="Скриншот дашборда"
          />
        </motion.div>
      </div>
    </section>
  )
}
