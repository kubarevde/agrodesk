import { useEffect } from 'react'
import { FieldDaySection } from '@/features/landing/FieldDaySection'
import { LandingAudienceSegment } from '@/features/landing/LandingAudienceSegment'
import { LandingCta } from '@/features/landing/LandingCta'
import { LandingFooter } from '@/features/landing/LandingFooter'
import { LandingHeader } from '@/features/landing/LandingHeader'
import { LandingHero } from '@/features/landing/LandingHero'
import { ModulesSection } from '@/features/landing/ModulesSection'
import { RolesFlow } from '@/features/landing/RolesFlow'
import { TelegramSection } from '@/features/landing/TelegramSection'
import '@/features/landing/landing.css'

const META_DESCRIPTION =
  'АгроДеск — учёт смен, склад ТМЦ, закупки, агрокалендарь и отчёты для КФХ. Роли admin, manager, employee и Telegram-бот.'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Public marketing page — no auth API calls. */
export function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'АгроДеск — учёт хозяйства для КФХ'
    upsertMeta('name', 'description', META_DESCRIPTION)
    upsertMeta('property', 'og:title', 'АгроДеск')
    upsertMeta('property', 'og:description', META_DESCRIPTION)
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingHeader />
      <main>
        <LandingAudienceSegment />
        <LandingHero />
        <FieldDaySection />
        <RolesFlow />
        <ModulesSection />
        <TelegramSection />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
