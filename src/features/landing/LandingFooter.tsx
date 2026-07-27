import { Link } from '@tanstack/react-router'
import { LANDING_NAV, scrollToSection } from '@/features/landing/nav'

export function LandingFooter() {
  return (
    <footer className="bg-foreground text-primary-foreground dark:bg-surface dark:text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="landing-display text-xl font-semibold">АгроДеск</p>
          <p className="mt-2 max-w-sm text-sm text-primary-foreground/70 dark:text-muted-foreground">
            Операционный контур КФХ: смены, склад, закупки, календарь и Telegram.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LANDING_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className="text-primary-foreground/80 underline-offset-4 hover:underline dark:text-muted-foreground"
              onClick={() => scrollToSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          <Link
            to="/login"
            className="font-medium text-primary-foreground underline-offset-4 hover:underline dark:text-primary"
          >
            Войти
          </Link>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15 dark:border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-primary-foreground/55 dark:text-muted-foreground">
          © {new Date().getFullYear()} АгроДеск
        </p>
      </div>
    </footer>
  )
}
