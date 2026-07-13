import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const COLUMNS = 10

export function ShiftsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: COLUMNS }).map((_, index) => (
            <TableHead key={index}>
              <Skeleton className="h-4 w-16" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: COLUMNS }).map((__, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className="h-4 w-full max-w-24" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
