import { motion } from 'framer-motion'
import { LANDING_IMAGES } from '@/features/landing/nav'

const BEATS = [
  {
    time: '06:40',
    title: 'Смена открыта в поле',
    text: 'Сотрудник выбирает объект, тип работ и технику — в приложении или в боте. Запись сразу в учёте.',
  },
  {
    time: '11:20',
    title: 'Склад и закупки на связи',
    text: 'Остатки ТМЦ и заявки на закупку видны менеджеру без переписки «у кого масло».',
  },
  {
    time: '18:05',
    title: 'Закрытие и факт в календаре',
    text: 'Закрытая полевая смена обновляет план или создаёт факт в агрокалендаре.',
  },
] as const

/** One-job section: a farm day as operational narrative. */
export function FieldDaySection() {
  return (
    <section id="day" className="scroll-mt-24 border-b border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:gap-12 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-14">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="relative min-h-72 overflow-hidden sm:min-h-80 lg:min-h-full"
        >
          <img
            src={LANDING_IMAGES.day}
            alt="Техника на полевых работах на рассвете"
            className="absolute inset-0 size-full object-cover object-[center_40%]"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent" aria-hidden />
          <p className="landing-kicker absolute bottom-5 left-5 text-[11px] text-primary-foreground/90">
            Рабочий день · поле
          </p>
        </motion.div>

        <div className="flex flex-col justify-center">
          <p className="landing-kicker text-[11px] text-primary">Сценарий</p>
          <h2 className="landing-display mt-3 text-balance text-3xl font-semibold text-foreground sm:text-4xl">
            Один день хозяйства — от смены до отчёта
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            АгроДеск связывает поле, склад и офис в одном контуре, а не в разрозненных Excel и
            Telegram-переписках.
          </p>

          <ol className="mt-10 space-y-0">
            {BEATS.map((beat, index) => (
              <li
                key={beat.time}
                className={`grid grid-cols-[5.5rem_1fr] gap-4 sm:grid-cols-[6.5rem_1fr] sm:gap-6 ${
                  index < BEATS.length - 1 ? 'border-b border-border pb-8 mb-8' : ''
                }`}
              >
                <div className="landing-display pt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-primary sm:text-[1.75rem]">
                  {beat.time}
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
                    {beat.title}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                    {beat.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
