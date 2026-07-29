import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { selectOptions } from '@/lib/selectOptions'
import { SETTINGS_SECTIONS, type SettingsTabId } from '../settingsSections'

type SettingsSectionNavProps = {
  value: SettingsTabId
  onChange: (tab: SettingsTabId) => void
  isMobile: boolean
}

/**
 * Mobile: full-width Select (no horizontal tab strip).
 * Desktop: wrapping TabsList without overflow-x scroll.
 */
export function SettingsSectionNav({ value, onChange, isMobile }: SettingsSectionNavProps) {
  if (isMobile) {
    return (
      <div className="w-full min-w-0 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Раздел настроек</p>
        <Select
          value={value}
          onValueChange={(next) => {
            if (next) onChange(next as SettingsTabId)
          }}
          items={selectOptions(
            SETTINGS_SECTIONS.map((section) => ({
              value: section.id,
              label: section.label,
            })),
          )}
        >
          <SelectTrigger
            className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-2.5"
            aria-label="Раздел настроек"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTINGS_SECTIONS.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <TabsList className="flex h-auto w-fit max-w-full flex-wrap justify-start gap-1">
      {SETTINGS_SECTIONS.map((section) => (
        <TabsTrigger key={section.id} value={section.id} className="shrink-0">
          {section.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
