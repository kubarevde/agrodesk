import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

function getBasepath(): string | undefined {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return undefined
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export const router = createRouter({
  routeTree,
  basepath: getBasepath(),
  context: {
    queryClient: undefined!,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
