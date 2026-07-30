import type { AgroPlan, WeatherAdvisory, WeatherAdvisorySeverity } from './types'

/** Prefer warning over info; used for badge color and month-grid markers. */
export function worstAdvisorySeverity(
  advisories: WeatherAdvisory[],
): WeatherAdvisorySeverity | null {
  if (!advisories.length) return null
  if (advisories.some((item) => item.severity === 'warning')) return 'warning'
  return 'info'
}

/** Icon/code for the highest-severity advisory (first warning, else first item). */
export function primaryAdvisoryCode(advisories: WeatherAdvisory[]): string | null {
  if (!advisories.length) return null
  const warning = advisories.find((item) => item.severity === 'warning')
  return (warning ?? advisories[0])?.code ?? null
}

export function plansHaveAdvisories(plans: AgroPlan[]): boolean {
  return plans.some((plan) => plan.advisories.length > 0)
}

export function dayAdvisorySeverity(
  plans: AgroPlan[],
): WeatherAdvisorySeverity | null {
  let worst: WeatherAdvisorySeverity | null = null
  for (const plan of plans) {
    const severity = worstAdvisorySeverity(plan.advisories)
    if (severity === 'warning') return 'warning'
    if (severity === 'info') worst = 'info'
  }
  return worst
}
