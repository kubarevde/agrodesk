import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  parseWorkspaceTab,
  type WorkspaceSearch,
} from '@/features/workspace/workspaceTabs'

const WorkspacePage = lazy(() =>
  import('@/features/workspace/components/WorkspacePage').then((m) => ({
    default: m.WorkspacePage,
  })),
)

export const Route = createFileRoute('/_layout/workspace/')({
  validateSearch: (search: Record<string, unknown>): WorkspaceSearch => {
    const tab = parseWorkspaceTab(search.tab) ?? 'shift'
    const chatId =
      typeof search.chatId === 'string' && search.chatId.trim()
        ? search.chatId.trim()
        : undefined
    return {
      tab,
      chatId: tab === 'messenger' ? chatId : undefined,
    }
  },
  component: WorkspacePage,
})
