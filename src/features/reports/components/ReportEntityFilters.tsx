import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ReportEntityFiltersProps {
  showEquipment: boolean
  showField: boolean
  equipmentId: string
  fieldId: string
  equipment: { id: string; name: string }[]
  fields: { id: string; name: string }[]
  onEquipmentIdChange: (id: string) => void
  onFieldIdChange: (id: string) => void
}

export function ReportEntityFilters({
  showEquipment,
  showField,
  equipmentId,
  fieldId,
  equipment,
  fields,
  onEquipmentIdChange,
  onFieldIdChange,
}: ReportEntityFiltersProps) {
  return (
    <>
      {showEquipment ? (
        <div className="space-y-2">
          <Label>Техника</Label>
          <Select
            value={equipmentId}
            onValueChange={(value) => onEquipmentIdChange(value ?? 'all')}
            items={[
              { value: 'all', label: 'Все' },
              ...equipment.map((item) => ({ value: item.id, label: item.name })),
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {equipment.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {showField ? (
        <div className="space-y-2">
          <Label>Поле</Label>
          <Select
            value={fieldId}
            onValueChange={(value) => onFieldIdChange(value ?? 'all')}
            items={[
              { value: 'all', label: 'Все' },
              ...fields.map((item) => ({ value: item.id, label: item.name })),
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {fields.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  )
}
