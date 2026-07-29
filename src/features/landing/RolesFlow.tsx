const ROLES = [
  {
    role: 'employee',
    title: 'Сотрудник',
    action: 'Отмечает смену',
    detail:
      'Открывает и закрывает смену в «Моя смена» или через Telegram-бот: объект, тип работ, техника. Часы уходят в учёт и начисление.',
  },
  {
    role: 'manager',
    title: 'Менеджер',
    action: 'Ведёт операционку',
    detail:
      'Смены, агрокалендарь, склад, закупки и отгрузки. Видит день хозяйства и закрывает потребности без лишних согласований в чате.',
  },
  {
    role: 'admin',
    title: 'Администратор',
    action: 'Держит контур',
    detail:
      'Сотрудники, роли и разделы, справочники, история изменений. Полный доступ организации и контроль прав.',
  },
] as const

export function RolesFlow() {
  return (
    <section id="roles" className="scroll-mt-24 border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="landing-kicker text-[11px] text-primary">Роли</p>
          <h2 className="landing-display mt-3 text-balance text-3xl font-semibold text-foreground sm:text-4xl">
            Три роли — один поток данных
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Права задаются по ролям организации. Сотрудник не видит лишнего; менеджер ведёт
            операции; администратор управляет доступами.
          </p>
        </div>

        <div className="mt-12 grid gap-0 border-t border-border lg:grid-cols-3">
          {ROLES.map((item, index) => (
            <article
              key={item.role}
              className="border-b border-border py-8 lg:border-b-0 lg:border-r lg:px-8 lg:py-10 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
            >
              <p className="landing-display text-3xl font-semibold tabular-nums tracking-tight text-primary">
                0{index + 1}
              </p>
              <h3 className="landing-display mt-5 text-2xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {item.role}
              </p>
              <p className="mt-6 text-base font-semibold text-foreground">{item.action}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
