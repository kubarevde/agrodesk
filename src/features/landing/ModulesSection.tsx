import { LANDING_IMAGES } from '@/features/landing/nav'

const FEATURED = [
  {
    name: 'Смены и рабочее время',
    text: 'Открытие и закрытие смен, объекты, типы работ, техника, длительность и начисления.',
    image: LANDING_IMAGES.shifts,
    alt: 'Полевые работы и техника',
  },
  {
    name: 'Склад ТМЦ и закупки',
    text: 'Остатки, приход и расход, заявки на закупку и закрытие потребности без потери контекста.',
    image: LANDING_IMAGES.warehouse,
    alt: 'Склад сельскохозяйственных материалов',
  },
  {
    name: 'Агрокалендарь',
    text: 'Планы по полям и датам, связь с фактическими сменами — план и факт в одном месте.',
    image: LANDING_IMAGES.calendar,
    alt: 'Планирование полевых работ',
  },
] as const

const MORE = [
  { name: 'Сотрудники и доступы', text: 'Роли admin / manager / employee и разделы по правам организации.' },
  { name: 'Техника и ТО', text: 'Парк, моточасы, ремонтный журнал и напоминания по обслуживанию.' },
  { name: 'Отчёты и дашборд', text: 'Сводка по сменам, затратам и KPI для руководства.' },
  { name: 'История изменений', text: 'Аудит: кто изменил смену, закупку или справочник.' },
] as const

export function ModulesSection() {
  return (
    <section id="modules" className="scroll-mt-24 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="landing-kicker text-[11px] text-primary">Модули</p>
            <h2 className="landing-display mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
              То, чем хозяйство пользуется каждый день
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground lg:text-right">
            Не абстрактные «преимущества» — рабочие контуры учёта.
          </p>
        </div>

        <div className="mt-12 space-y-14">
          {FEATURED.map((mod, index) => (
            <article
              key={mod.name}
              className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                index % 2 === 1 ? 'lg:[&>div:first-child]:order-2' : ''
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={mod.image}
                  alt={mod.alt}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <h3 className="landing-display text-2xl font-semibold text-foreground sm:text-3xl">
                  {mod.name}
                </h3>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                  {mod.text}
                </p>
              </div>
            </article>
          ))}
        </div>

        <ul className="mt-16 grid gap-x-10 gap-y-8 border-t border-border pt-10 sm:grid-cols-2">
          {MORE.map((mod) => (
            <li key={mod.name}>
              <h3 className="font-semibold text-foreground">{mod.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mod.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
