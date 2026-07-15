import { motion } from 'framer-motion'
import { Briefcase, HardHat, UserRound } from 'lucide-react'

const AUDIENCE = [
  {
    title: 'Владелец',
    text: 'Видит полную картину: затраты, смены, зарплату и склад.',
    icon: Briefcase,
  },
  {
    title: 'Менеджер',
    text: 'Управляет сменами, справочниками и контролирует работу в поле.',
    icon: UserRound,
  },
  {
    title: 'Сотрудник',
    text: 'Отмечает начало и конец работы через Telegram-бот.',
    icon: HardHat,
  },
] as const

export function ForWhom() {
  return (
    <section id="audience" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-semibold text-[var(--landing-text)] sm:text-3xl">
          Для кого
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--landing-muted)]">
          Роли с понятными правами — каждый видит своё.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {AUDIENCE.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-green-100 bg-[var(--landing-section-alt)] p-6 text-center"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100 text-[var(--landing-primary)]">
                <item.icon className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--landing-text)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--landing-muted)]">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
