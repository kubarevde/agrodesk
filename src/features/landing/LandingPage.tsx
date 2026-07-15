import { useEffect, type CSSProperties } from 'react'
import { FeaturesGrid } from '@/features/landing/FeaturesGrid'
import { ForWhom } from '@/features/landing/ForWhom'
import { HowItWorks } from '@/features/landing/HowItWorks'
import { LandingCta } from '@/features/landing/LandingCta'
import { LandingFooter } from '@/features/landing/LandingFooter'
import { LandingHeader } from '@/features/landing/LandingHeader'
import { LandingHero } from '@/features/landing/LandingHero'
import { ScreenshotsStrip } from '@/features/landing/ScreenshotsStrip'

const META_DESCRIPTION =
  'Учёт рабочего времени, склад и зарплата для агропредприятий. Telegram-бот, дашборд в реальном времени, расчёт зарплаты.'

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

const landingVars = {
  '--landing-primary': '#16a34a',
  '--landing-section-alt': '#f0fdf4',
  '--landing-text': '#111827',
  '--landing-muted': '#6b7280',
} as CSSProperties

export function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'АгроДеск — Управление аграрным хозяйством'
    upsertMeta('name', 'description', META_DESCRIPTION)
    upsertMeta('property', 'og:title', 'АгроДеск')
    upsertMeta('property', 'og:description', META_DESCRIPTION)
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="landing-page min-h-screen bg-white text-[var(--landing-text)]" style={landingVars}>
      <LandingHeader />
      <main>
        <LandingHero />
        <HowItWorks />
        <FeaturesGrid />
        <ForWhom />
        <ScreenshotsStrip />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
