import { SectionHelp } from '@/components/shared/SectionHelp'
import { forecastHelp } from '@/features/help/modules'

/** Same unified help pattern as other sections (replaces standalone Info card). */
export function ForecastHowItWorks() {
  return <SectionHelp section="прогноз" items={forecastHelp} />
}
