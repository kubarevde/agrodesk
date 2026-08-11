import type { SectionHelpItem } from '@/components/shared/SectionHelp'
import type { SettingsTabId } from '@/features/settings/settingsSections'
import { getSettingsSectionLabel } from '@/features/settings/settingsSections'
import { settingsTimezoneHelp } from './content'
import { settingsAccessHelp } from './modules'

export type SettingsTabHelp = {
  section: string
  items: SectionHelpItem[]
}

const settingsCropsHelp: SectionHelpItem[] = [
  {
    question: 'Зачем справочник культур?',
    answer:
      'Культуры выбираются у полей, на складе «Урожай», в отгрузках и отчётах. Один список — чтобы везде были одни и те же названия.',
  },
  {
    question: 'Что сделать перед сезоном?',
    answer:
      'Проверьте, что все нужные культуры есть и активны. Без культуры нельзя нормально завести поле и учёт урожая.',
  },
  {
    question: 'Что такое сорта?',
    answer:
      'У каждой культуры можно вести список сортов (меню «…» → «Сорта»). Сорт необязателен: старые данные без сорта продолжают работать. Один и тот же сорт у разных культур — разные записи.',
  },
  {
    question: 'Можно ли удалить культуру?',
    answer:
      'Если она уже используется, лучше деактивировать, а не удалять — история и поля сохранят связь.',
  },
]

const settingsImplementCatsHelp: SectionHelpItem[] = [
  {
    question: 'Что это за категории?',
    answer:
      'Группы для приспособлений (плуг, сеялка и т.п.). Выбираются при создании карточки приспособления.',
  },
  {
    question: 'Где сами приспособления?',
    answer:
      'В разделе «Приспособления». Здесь только список категорий для форм и фильтров.',
  },
]

const settingsInventoryCatsHelp: SectionHelpItem[] = [
  {
    question: 'Зачем категории ТМЦ?',
    answer:
      'Топливо, удобрения, урожай и другие типы позиций склада. От категории зависят фильтры и часть сценариев (например урожай).',
  },
  {
    question: 'Где добавлять дизель и запчасти?',
    answer:
      'Конкретные позиции создаются в разделе «Склад ТМЦ». Здесь — только справочник категорий.',
  },
]

const settingsExpenseCatsHelp: SectionHelpItem[] = [
  {
    question: 'Зачем категории затрат?',
    answer:
      'Ими помечают записи в «Затратах и доходах», фильтры и финансовые отчёты. Без нужной категории нечего выбрать в форме.',
  },
  {
    question: 'Нет нужной статьи — что делать?',
    answer: 'Добавьте категорию здесь, затем используйте её при создании затраты.',
  },
]

const settingsIncomeCatsHelp: SectionHelpItem[] = [
  {
    question: 'Для каких доходов эти категории?',
    answer:
      'Только для ручных доходов: услуги, шеринг, субсидии и т.п. Выручка от отгрузок урожая и ТМЦ подтягивается автоматически и сюда не заносится.',
  },
  {
    question: 'Нет нужной категории?',
    answer: 'Добавьте её здесь, затем выберите при ручном добавлении дохода на вкладке «Доходы».',
  },
]

const settingsMaintenanceTypesHelp: SectionHelpItem[] = [
  {
    question: 'Что такое типы ТО?',
    answer:
      'Виды обслуживания техники и приспособлений (например замена масла). Выбираются при записи ТО.',
  },
  {
    question: 'Что даёт интервал по умолчанию?',
    answer:
      'Подсказку при заполнении «Следующее ТО на…». Это не жёсткий запрет — фактический план задаёте вы.',
  },
]

const settingsRepairStatusesHelp: SectionHelpItem[] = [
  {
    question: 'Какие статусы нужны?',
    answer:
      'Типичный набор: «В ремонте», «Ожидает запчасти», «Завершён», «Отменён». Ими пользуются журнал ремонта и связанные экраны.',
  },
  {
    question: 'Как отметить ожидание запчастей?',
    answer:
      'При статусе «В ремонте» можно дополнительно отметить ожидание запчастей — техника ещё в ремонте, но работы ждут детали.',
  },
]

const settingsLocationsHelp: SectionHelpItem[] = [
  {
    question: 'Чем места работы отличаются от полей?',
    answer:
      'Места работы — объекты для смен (мастерская, зернохранилище, админкорпус). Учёт участков с культурами — в разделе «Поля».',
  },
  {
    question: 'Где выбрать место при открытии смены?',
    answer:
      'В форме смены из этого справочника. Если объекта нет в списке — добавьте его здесь.',
  },
]

const settingsWorkTypesHelp: SectionHelpItem[] = [
  {
    question: 'Зачем типы работ?',
    answer:
      'Ими помечают смены, ставки оплаты и планы агрокалендаря. Один справочник для веба и Telegram-бота.',
  },
  {
    question: 'Что будет без типа работ?',
    answer:
      'В сменах и планах нечего выбрать, ставки по видам работ не привязать. Заведите актуальный список до сезона.',
  },
]

const settingsNotificationsHelp: SectionHelpItem[] = [
  {
    question: 'Чьи это настройки?',
    answer:
      'Личные предпочтения этого браузера: какие уведомления показывать вам. На других устройствах задаются отдельно.',
  },
  {
    question: 'Связаны ли они с ботом?',
    answer:
      'Пока сохраняются локально. Рассылка Telegram-бота будет учитывать похожие настройки отдельно.',
  },
]

const SETTINGS_TAB_HELP: Record<SettingsTabId, SettingsTabHelp> = {
  crops: { section: 'культуры', items: settingsCropsHelp },
  'implement-cats': {
    section: 'категории приспособлений',
    items: settingsImplementCatsHelp,
  },
  'inventory-cats': { section: 'категории ТМЦ', items: settingsInventoryCatsHelp },
  'expense-cats': { section: 'категории затрат', items: settingsExpenseCatsHelp },
  'income-cats': { section: 'категории доходов', items: settingsIncomeCatsHelp },
  'maintenance-types': { section: 'типы ТО', items: settingsMaintenanceTypesHelp },
  'repair-statuses': { section: 'статусы ремонта', items: settingsRepairStatusesHelp },
  locations: { section: 'места работы', items: settingsLocationsHelp },
  'work-types': { section: 'типы работ', items: settingsWorkTypesHelp },
  timezone: { section: 'часовой пояс', items: settingsTimezoneHelp },
  access: { section: 'доступы', items: settingsAccessHelp },
  notifications: { section: 'уведомления', items: settingsNotificationsHelp },
}

/** Help block for the active Settings tab (dictionaries + org params). */
export function getSettingsTabHelp(tab: SettingsTabId): SettingsTabHelp {
  return (
    SETTINGS_TAB_HELP[tab] ?? {
      section: getSettingsSectionLabel(tab).toLowerCase(),
      items: settingsTimezoneHelp,
    }
  )
}
