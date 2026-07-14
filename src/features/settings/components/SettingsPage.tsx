import { Tractor, Wrench } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FieldsAndLocationsTab } from './FieldsAndLocationsTab'
import { InventoryItemsTab } from './InventoryItemsTab'
import { NotificationPrefsTab } from './NotificationPrefsTab'
import { SectionMovedNotice } from './SectionMovedNotice'
import { WorkTypesTab } from './WorkTypesTab'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Настройки</h1>

      <Tabs defaultValue="locations">
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
          <TabsTrigger value="locations">Поля и объекты</TabsTrigger>
          <TabsTrigger value="equipment">Техника</TabsTrigger>
          <TabsTrigger value="implements">Приспособления</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="work-types">Типы работ</TabsTrigger>
          <TabsTrigger value="inventory">Позиции ТМЦ</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="mt-4">
          <FieldsAndLocationsTab />
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <SectionMovedNotice
            icon={Tractor}
            title="Управление техникой перенесено"
            description="Управление техникой перенесено в раздел /equipment"
            to="/equipment"
            actionLabel="Перейти к технике"
          />
        </TabsContent>

        <TabsContent value="implements" className="mt-4">
          <SectionMovedNotice
            icon={Wrench}
            title="Управление приспособлениями перенесено"
            description="Управление приспособлениями перенесено в /implements"
            to="/implements"
            actionLabel="Перейти"
          />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationPrefsTab />
        </TabsContent>

        <TabsContent value="work-types" className="mt-4">
          <WorkTypesTab />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <InventoryItemsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
