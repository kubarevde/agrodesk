import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingCta() {
  return (
    <section className="bg-primary text-primary-foreground">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-6xl px-4 py-16 sm:py-20"
      >
        <h2 className="landing-display max-w-2xl text-3xl font-semibold sm:text-4xl">
          Войдите в АгроДеск под своей организацией
        </h2>
        <p className="mt-4 max-w-xl text-primary-foreground/80">
          После входа откроется первый доступный вам раздел по роли и правам: сотруднику —
          «Моя смена», менеджеру — рабочий контур без обязательного дашборда.
        </p>
        <Link
          to="/login"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'mt-8 inline-flex min-h-11 bg-primary-foreground text-primary hover:bg-primary-foreground/90',
          )}
        >
          Войти в систему
        </Link>
      </motion.div>
    </section>
  )
}
