import type { HoldingReportExportPayload } from '@/features/holding/api'
import { downloadHoldingReport } from '@/features/holding/api'
import type { HoldingChildListItem } from '@/features/holding/types'
import type { ReportDefinition } from '@/features/reports/reportDefinitions'
import type { ReportScopeKind } from '@/features/reports/components/HoldingReportScopeFields'
import {
  buildReportBody,
  buildReportFilename,
  downloadReport,
} from '@/features/reports/utils'
import { displayDateToIso } from '@/lib/transformers'

export async function exportReportWithScope(opts: {
  report: ReportDefinition
  scope: ReportScopeKind
  useHolding: boolean
  childOrgId: string
  children: HoldingChildListItem[]
  from: string
  to: string
  month: string
  year: string
  equipmentId?: string
  fieldId?: string
}): Promise<void> {
  const {
    report,
    scope,
    useHolding,
    childOrgId,
    children,
    from,
    to,
    month,
    year,
    equipmentId,
    fieldId,
  } = opts

  if (useHolding && scope !== 'current') {
    const payload: HoldingReportExportPayload = {
      report_id: report.id,
      mode: scope,
      ...(scope === 'child' ? { child_org_id: childOrgId } : {}),
      ...(report.periodMode === 'month'
        ? { month }
        : report.periodMode === 'year'
          ? { year: Number(year) }
          : {
              from_date: displayDateToIso(from),
              to_date: displayDateToIso(to),
            }),
    }
    const childSlug = children.find((c) => c.orgId === childOrgId)?.slug ?? 'child'
    const filename =
      scope === 'group'
        ? `holding_${report.id}_group.xlsx`
        : `holding_${report.id}_${childSlug}.xlsx`
    await downloadHoldingReport(payload, filename)
    return
  }

  await downloadReport(
    report.endpoint,
    buildReportBody(report, { from, to, month, year, equipmentId, fieldId }),
    buildReportFilename(report, { from, to, month, year }),
  )
}
