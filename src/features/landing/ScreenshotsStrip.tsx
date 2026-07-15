import { MockupBrowser } from '@/features/landing/MockupBrowser'

const SHOTS = [
  { src: '/screenshots/dashboard.png', label: 'Дашборд', file: 'dashboard.png' },
  { src: '/screenshots/shifts.png', label: 'Смены', file: 'shifts.png' },
  { src: '/screenshots/salary.png', label: 'Зарплата', file: 'salary.png' },
] as const

export function ScreenshotsStrip() {
  return (
    <section className="bg-[var(--landing-section-alt)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-semibold text-[var(--landing-text)] sm:text-3xl">
          Скриншоты
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--landing-muted)]">
          Интерфейс, в котором удобно работать каждый день.
        </p>
        <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SHOTS.map((shot) => (
            <div key={shot.file} className="w-[min(85vw,420px)] shrink-0 snap-center">
              <MockupBrowser
                src={shot.src}
                alt={shot.label}
                placeholderLabel={`${shot.label} (${shot.file})`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
