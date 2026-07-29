/**
 * Shared wording for help texts and the system guide.
 * Use these names everywhere so users hear the same words.
 */

export type TermDef = {
  label: string
  /** One plain sentence */
  meaning: string
  /** Real-life example */
  example: string
}

export const TERM_DEFS: Record<string, TermDef> = {
  shift: {
    label: 'смена',
    meaning: 'Учёт рабочего времени: когда начали, когда закончили, где и на чём работали.',
    example: 'Иван открыл смену в 8:00 на поле «Север», закрыл в 17:00 — в оплату уйдут эти часы.',
  },
  tmc: {
    label: 'ТМЦ',
    meaning: 'Товарно-материальные ценности: топливо, запчасти, семена, расходники на складе.',
    example: 'Списали 40 л дизеля на трактор — остаток на складе уменьшился, в карточке техники появилась заправка.',
  },
  agroPlan: {
    label: 'агроплан',
    meaning: 'Запланированная работа по полям и дате в агрокалендаре.',
    example: 'На понедельник запланировали сев на поле «Юг» — сотрудник выберет этот план при открытии смены.',
  },
  fact: {
    label: 'факт',
    meaning: 'Запись о выполненной работе, которая появилась сама после закрытия полевой смены без выбранного плана.',
    example: 'Смену закрыли без плана — в календаре появился факт. Его нельзя править руками.',
  },
  field: {
    label: 'поле',
    meaning: 'Участок хозяйства: название, площадь, культура, контур на карте.',
    example: 'Поле «Запад-3», 42 га, пшеница — видно в списке и на карте.',
  },
  contour: {
    label: 'контур',
    meaning: 'Граница поля на карте (многоугольник).',
    example: 'Нарисовали контур по меже — площадь считается точнее, поле видно на карте целиком.',
  },
  weatherPoint: {
    label: 'погодная точка',
    meaning: 'Точка на карте (или центр контура), откуда берётся погода для поля.',
    example: 'Без точки или контура погода по полю не подтянется.',
  },
  supportTicket: {
    label: 'обращение в поддержку',
    meaning: 'Заявка в техподдержку платформы с перепиской и статусом.',
    example: 'Написали «Не открывается карта» — суперадмин ответил в той же переписке.',
  },
  superadmin: {
    label: 'суперадмин',
    meaning: 'Администратор всей платформы: создаёт хозяйства и отвечает на обращения поддержки.',
    example: 'Суперадмин создал организацию «Демо» и выдал временный пароль владельцу.',
  },
  orgAdmin: {
    label: 'админ организации',
    meaning: 'Руководитель хозяйства в АгроДеск: люди, доступы, настройки, почти все разделы.',
    example: 'Админ включил сотруднику раздел «Поля» во вкладке «Доступы».',
  },
  employee: {
    label: 'сотрудник',
    meaning: 'Работник хозяйства: обычно «Моя смена» и те разделы, которые ему открыли.',
    example: 'Сотрудник EMP012 начинает и закрывает смену с телефона.',
  },
  manager: {
    label: 'менеджер',
    meaning: 'Руководитель среднего звена: смены людей, склад, планы — по правам организации.',
    example: 'Менеджер открыл смену за тракториста и сверил журнал за неделю.',
  },
}

/** Short labels kept for older imports / compact UI copy. */
export const TERMS = {
  shift: TERM_DEFS.shift.label,
  shifts: 'смены',
  inventory: 'склад',
  tmc: TERM_DEFS.tmc.label,
  agroCalendar: 'агрокалендарь',
  agroPlan: TERM_DEFS.agroPlan.label,
  fact: TERM_DEFS.fact.label,
  myShift: 'Моя смена',
  worktime: 'Рабочее время',
  support: 'Поддержка',
  supportTicket: TERM_DEFS.supportTicket.label,
  guide: 'Как пользоваться системой',
  dashboard: 'Дашборд',
  field: TERM_DEFS.field.label,
  fields: 'поля',
  contour: TERM_DEFS.contour.label,
  weatherPoint: TERM_DEFS.weatherPoint.label,
  equipment: 'техника',
  implement: 'приспособление',
  maintenance: 'ремонт',
  purchase: 'закупка',
  expense: 'затрата',
  shipment: 'отгрузка',
  superadmin: TERM_DEFS.superadmin.label,
  orgAdmin: TERM_DEFS.orgAdmin.label,
  employee: TERM_DEFS.employee.label,
  manager: TERM_DEFS.manager.label,
} as const

/** Short section blurbs for permissions UI and help summaries. */
export const SECTION_SUMMARIES: Record<string, string> = {
  dashboard: 'Сводка за день: кто на смене, что срочно, что нужно купить.',
  worktime: 'Журнал смен: кто когда работал, сколько часов.',
  'agro-calendar': 'План работ по полям и датам. Можно смотреть погоду по полю.',
  sharing: 'Объявления: взять или отдать технику / поле в совместное использование.',
  fields: 'Список и карта полей: контур, культура, погодная точка.',
  equipment: 'Ваша техника: наработка, ТО, заправки, ремонт.',
  implements: 'Приспособления к технике и их обслуживание.',
  maintenance: 'Журнал ремонтов: что чиним и что нужно купить.',
  'purchase-planner': 'Список покупок: что купить и что уже куплено.',
  inventory: 'Склад ТМЦ: остатки, приход, расход, корректировка.',
  shipments: 'Учёт отгрузок урожая.',
  expenses: 'Деньги, которые хозяйство потратило.',
  analytics: 'Прогноз по прошлым отгрузкам и затратам.',
  reports: 'Скачать отчёты в Excel.',
  employees: 'Люди в хозяйстве, роли и ставки оплаты.',
  'audit-log': 'Кто что менял в системе.',
  settings: 'Настройки хозяйства и кто что может открывать.',
  'my-shift': 'Ваша смена: начать, закончить, посмотреть начисления.',
  support: 'Написать в техподдержку или открыть обучающий гайд.',
}

/** Maps UI section keys to guide step ids for ?section= deep-links. */
export const GUIDE_SECTION_ALIASES: Record<string, string> = {
  dashboard: 'daily',
  'my-shift': 'my-shift',
  worktime: 'worktime',
  'agro-calendar': 'calendar',
  fields: 'fields',
  inventory: 'inventory',
  equipment: 'equipment',
  reports: 'reports',
  employees: 'people',
  support: 'help',
  settings: 'settings',
  login: 'first-day',
  смена: 'my-shift',
  смены: 'worktime',
  поля: 'fields',
  склад: 'inventory',
  поддержка: 'help',
  дашборд: 'daily',
  агрокалендарь: 'calendar',
  техника: 'equipment',
  отчёты: 'reports',
  сотрудники: 'people',
}
