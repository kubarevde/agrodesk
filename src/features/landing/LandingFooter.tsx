import { Link } from '@tanstack/react-router'

export function LandingFooter() {
  return (
    <footer id="privacy" className="border-t border-green-100 bg-[var(--landing-section-alt)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[var(--landing-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 АгроДеск</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/login" className="hover:text-[var(--landing-text)]">
            Войти
          </Link>
          <a href="#privacy" className="hover:text-[var(--landing-text)]">
            Политика конфиденциальности
          </a>
        </div>
      </div>
    </footer>
  )
}
