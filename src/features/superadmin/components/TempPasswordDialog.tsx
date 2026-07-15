import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { OrganizationCreateResult } from '@/features/superadmin/types'

type TempPasswordDialogProps = {
  result: OrganizationCreateResult | null
  onClose: () => void
}

export function TempPasswordDialog({ result, onClose }: TempPasswordDialogProps) {
  return (
    <Dialog open={Boolean(result)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Организация создана</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-3 text-sm">
            <p className="text-foreground">
              Организация создана! Admin: <strong>{result.adminEmail}</strong>
            </p>
            <p className="rounded-lg bg-muted px-3 py-2 font-mono text-base">
              Пароль: {result.tempPassword}
            </p>
            <p className="text-muted-foreground">Сохрани — больше не покажем.</p>
            <p className="text-muted-foreground">
              Код входа в основное приложение: ADM-{result.organization.slug}
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Понятно
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
