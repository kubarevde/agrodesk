import { Tractor, Wrench, Package } from 'lucide-react'
import { getRouteApi } from '@tanstack/react-router'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { DictionarySettingsTab } from '@/features/dictionaries/components/DictionarySettingsTab'
import { settingsTimezoneHelp } from '@/features/help/content'
import { settingsAccessHelp } from '@/features/help/modules'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { SettingsTabId } from '../settingsSections'
import { AccessGroupsTab } from './AccessGroupsTab'
import { LocationsTab } from './LocationsTab'
import { NotificationPrefsTab } from './NotificationPrefsTab'
import { RolePermissionsTab } from './RolePermissionsTab'
import { SectionMovedNotice } from './SectionMovedNotice'
import { SettingsSectionNav } from './SettingsSectionNav'
import { TimezoneTab } from './TimezoneTab'
import { WorkTypesTab } from './WorkTypesTab'

const settingsRoute = getRouteApi('/_layout/settings/')

/**
 * Settings = org parameters + system dictionaries used across the app.
 * Operational CRUD lives in domain pages. Mobile nav: Select; desktop: wrapping tabs.
 */
export function SettingsPage() {
  const { tab } = settingsRoute.useSearch()
  const navigate = settingsRoute.useNavigate()
  const isMobile = useIsMobile(639)

  const setTab = (next: SettingsTabId) => {
    void navigate({
      search: (prev) => ({ ...prev, tab: next }),
      replace: true,
    })
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Справочники и параметры организации. Технику, поля, приспособления и позиции склада
          ведите в их разделах — здесь только то, что выбирается в формах.
        </p>
      </div>

      <RoleSectionHelp
        section="часовой пояс"
        items={settingsTimezoneHelp}
        guideSection="settings"
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as SettingsTabId)}
        className="w-full min-w-0"
      >
        <SettingsSectionNav value={tab} onChange={setTab} isMobile={isMobile} />

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

        <TabsContent value="access" className="mt-4 w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
          <p className="text-sm text-muted-foreground break-words">
            Роли задают базовые разделы. Группа доступа персонально заменяет базовый набор для
            сотрудника (в т.ч. предустановка «Снабженец»). Администратор всегда имеет полный доступ.
          </p>
          <AccessGroupsTab />
          <RolePermissionsTab />
          <RoleSectionHelp section="доступы" items={settingsAccessHelp} guideSection="settings" />
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
