import { Map } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LocationsTab } from './LocationsTab'
import { SectionMovedNotice } from './SectionMovedNotice'

export function FieldsAndLocationsTab() {
  return (
    <Tabs defaultValue="locations">
      <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
        <TabsTrigger value="locations">Места работы</TabsTrigger>
        <TabsTrigger value="fields">Поля</TabsTrigger>
      </TabsList>

      <TabsContent value="locations" className="mt-4">
        <LocationsTab />
      </TabsContent>

      <TabsContent value="fields" className="mt-4">
        <SectionMovedNotice
          icon={Map}
          title="Управление полями перенесено"
          description="Управление полями перенесено в раздел /fields. Здесь остаются только места работы для смен."
          to="/fields"
          actionLabel="Перейти к полям"
        />
      </TabsContent>
    </Tabs>
  )
}
