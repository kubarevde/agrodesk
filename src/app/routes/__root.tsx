import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PwaInstallCapture } from '@/hooks/usePwaInstall'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  errorComponent: RootErrorComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <PwaInstallCapture />
      <Outlet />
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </QueryClientProvider>
  )
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Что-то пошло не так</h1>
        <p className="text-sm text-muted-foreground">
          Не удалось отобразить экран. Попробуйте обновить страницу или вернуться назад.
        </p>
        {import.meta.env.DEV ? (
          <p className="break-words rounded-md border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground">
            {error.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Назад
        </Button>
        <Button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary-hover"
          onClick={() => reset()}
        >
          Попробовать снова
        </Button>
      </div>
    </div>
  )
}
