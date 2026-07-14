import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EquipmentTab } from './EquipmentTab'
import { InventoryItemsTab } from './InventoryItemsTab'
import { LocationsTab } from './LocationsTab'
import { WorkTypesTab } from './WorkTypesTab'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Настройки</h1>

      <Tabs defaultValue="locations">
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
          <TabsTrigger value="locations">Объекты</TabsTrigger>
          <TabsTrigger value="work-types">Типы работ</TabsTrigger>
          <TabsTrigger value="equipment">Техника</TabsTrigger>
          <TabsTrigger value="inventory">Позиции ТМЦ</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="mt-4">
          <LocationsTab />
        </TabsContent>
        <TabsContent value="work-types" className="mt-4">
          <WorkTypesTab />
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          <InventoryItemsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
