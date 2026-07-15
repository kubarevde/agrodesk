import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingCta() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl px-4 text-center"
      >
        <h2 className="text-2xl font-semibold text-[var(--landing-text)] sm:text-3xl">
          Готовы начать?
        </h2>
        <p className="mt-3 text-[var(--landing-muted)]">
          Подключите хозяйство и ведите учёт уже сегодня.
        </p>
        <Link
          to="/login"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'mt-8 inline-flex min-h-11 bg-[var(--landing-primary)] px-6 text-white hover:bg-green-700',
          )}
        >
          Войти в систему
        </Link>
      </motion.div>
    </section>
  )
}
