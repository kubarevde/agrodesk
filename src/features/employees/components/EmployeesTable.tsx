import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Employee } from '@/types'
import { createEmployeeColumns, type EmployeeRowActions } from './employeesColumns'
import { EmployeesMobileList } from './EmployeesMobileList'

interface EmployeesTableProps {
  employees: Employee[]
  actions: EmployeeRowActions | null
  onRowClick: (employee: Employee) => void
  employeeIdsWithRates?: Set<string>
}

export function EmployeesTable({
  employees,
  actions,
  onRowClick,
  employeeIdsWithRates = new Set(),
}: EmployeesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const columns = useMemo(
    () => createEmployeeColumns(actions, employeeIdsWithRates),
    [actions, employeeIdsWithRates],
  )

  const table = useReactTable({
    data: employees,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EmployeesMobileList
        employees={employees}
        actions={actions}
        onRowClick={onRowClick}
        employeeIdsWithRates={employeeIdsWithRates}
      />
    </>
  )
}
