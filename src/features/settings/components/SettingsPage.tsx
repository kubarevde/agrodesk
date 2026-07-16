import { Tractor, Wrench, Package } from 'lucide-react'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DictionarySettingsTab } from '@/features/dictionaries/components/DictionarySettingsTab'
import { settingsTimezoneHelp } from '@/features/help/content'
import { LocationsTab } from './LocationsTab'
import { NotificationPrefsTab } from './NotificationPrefsTab'
import { SectionMovedNotice } from './SectionMovedNotice'
import { TimezoneTab } from './TimezoneTab'
import { WorkTypesTab } from './WorkTypesTab'

/**
 * Settings = org parameters + system dictionaries used across the app.
 * Operational CRUD (equipment, implements, fields, inventory items) lives in domain pages.
 */
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Справочники и параметры организации. Технику, поля, приспособления и позиции склада
          ведите в их разделах — здесь только то, что выбирается в формах.
        </p>
      </div>

      <SectionHelp title="Справка: часовой пояс" items={settingsTimezoneHelp} />

      <Tabs defaultValue="crops">
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
          <TabsTrigger value="crops">Культуры</TabsTrigger>
          <TabsTrigger value="implement-cats">Категории приспособлений</TabsTrigger>
          <TabsTrigger value="inventory-cats">Категории ТМЦ</TabsTrigger>
          <TabsTrigger value="expense-cats">Категории затрат</TabsTrigger>
          <TabsTrigger value="locations">Места работы</TabsTrigger>
          <TabsTrigger value="work-types">Типы работ</TabsTrigger>
          <TabsTrigger value="timezone">Часовой пояс</TabsTrigger>
          <TabsTrigger value="notifications">Мои уведомления</TabsTrigger>
        </TabsList>

        <TabsContent value="crops" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Список культур для полей, отгрузок и связанных отчётов.
          </p>
          <DictionarySettingsTab type="crop" />
        </TabsContent>

        <TabsContent value="implement-cats" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Категории выбираются при создании приспособления. Сами приспособления — в разделе
            «Приспособления».
          </p>
          <DictionarySettingsTab type="implement_category" />
          <SectionMovedNotice
            icon={Wrench}
            title="Приспособления"
            description="Карточки и учёт ТО приспособлений — в отдельном разделе."
            to="/implements"
            actionLabel="Открыть приспособления"
          />
        </TabsContent>

        <TabsContent value="inventory-cats" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Категории (Топливо, Удобрения…) для позиций склада. Конкретные товары создаются на
            складе ТМЦ.
          </p>
          <DictionarySettingsTab type="inventory_category" />
          <SectionMovedNotice
            icon={Package}
            title="Позиции склада"
            description="Добавление дизеля, масел и запчастей — во вкладке «Склад ТМЦ»."
            to="/inventory"
            actionLabel="Открыть склад"
          />
        </TabsContent>

        <TabsContent value="expense-cats" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Категории для раздела «Затраты», фильтров и финансовых отчётов. Если нужной категории
            нет — добавьте её здесь.
          </p>
          <DictionarySettingsTab type="expense_category" />
        </TabsContent>

        <TabsContent value="locations" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Объекты для открытия смены (мастерская, зернохранилище…). Поля с культурами — в
            разделе «Поля».
          </p>
          <LocationsTab />
          <SectionMovedNotice
            icon={Tractor}
            title="Поля"
            description="Учёт участков и культур ведётся в разделе «Поля»."
            to="/fields"
            actionLabel="Открыть поля"
          />
        </TabsContent>

        <TabsContent value="work-types" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Типы работ для смен, ставок и агрокалендаря. Используются в вебе и в Telegram-боте.
          </p>
          <WorkTypesTab />
        </TabsContent>

        <TabsContent value="timezone" className="mt-4">
          <TimezoneTab />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Личные предпочтения этого браузера. Пока сохраняются локально; рассылка бота будет
            учитывать их отдельно.
          </p>
          <NotificationPrefsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
