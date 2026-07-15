import { motion } from 'framer-motion'

const STEPS = [
  {
    n: '1',
    title: 'Открыл Telegram-бот',
    text: 'Нажал «Начал работу», выбрал объект и тип работы.',
  },
  {
    n: '2',
    title: 'Данные в системе',
    text: 'Мгновенно в АгроДеск — менеджер видит, кто работает.',
  },
  {
    n: '3',
    title: 'Конец месяца',
    text: 'Автоматический расчёт ЗП и Excel одной кнопкой.',
  },
] as const

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-semibold text-[var(--landing-text)] sm:text-3xl">
          Как работает
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--landing-muted)]">
          От смены в поле до зарплаты — без таблиц и бумажных журналов.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const fromLeft = i % 2 === 0
            return (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, x: fromLeft ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
                className="rounded-xl border border-green-100 bg-[var(--landing-section-alt)] p-6"
              >
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--landing-primary)] text-sm font-semibold text-white">
                  {step.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--landing-text)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--landing-muted)]">{step.text}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
