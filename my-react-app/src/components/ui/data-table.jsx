import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"
import { Button, Input, Checkbox } from "antd"
import { 
  LeftOutlined,
  RightOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  SearchOutlined
} from "@ant-design/icons"

const { Search } = Input;

export function DataTable({
  columns,
  data,
  searchable = true,
  pagination = true,
  pageSize = 10,
  onRowClick = null,
  onRowDoubleClick = null,
  onRowSelect = null,
  enableRowSelection = false,
}) {
  const [sorting, setSorting] = React.useState([])
  const [columnFilters, setColumnFilters] = React.useState([])
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Add selection column if row selection is enabled
  const columnsWithSelection = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    
    const selectionColumn = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onChange={(e) => {
            row.toggleSelected(e.target.checked);
            if (onRowSelect) {
              onRowSelect(row.original, e.target.checked);
            }
          }}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };
    
    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection, onRowSelect]);

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    enableRowSelection: enableRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  })

  return (
    <div className="w-full">
      {/* Search */}
      {searchable && (
        <div className="flex items-center py-4">
          <Search
            placeholder="Buscar en la tabla..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            prefix={<SearchOutlined />}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(e) => {
                    // Prevent click if clicking on checkbox
                    if (e.target.type === 'checkbox') return;
                    if (onRowClick) onRowClick(row.original);
                  }}
                  onDoubleClick={(e) => {
                    // Prevent double click if clicking on checkbox
                    if (e.target.type === 'checkbox') return;
                    if (onRowDoubleClick) onRowDoubleClick(row.original);
                  }}
                  className={(onRowClick || onRowDoubleClick) ? "cursor-pointer hover:bg-gray-100" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} de{" "}
            {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Página {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                type="default"
                size="small"
                icon={<DoubleLeftOutlined />}
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                title="Ir a la primera página"
              />
              <Button
                type="default"
                size="small"
                icon={<LeftOutlined />}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                title="Ir a la página anterior"
              />
              <Button
                type="default"
                size="small"
                icon={<RightOutlined />}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                title="Ir a la página siguiente"
              />
              <Button
                type="default"
                size="small"
                icon={<DoubleRightOutlined />}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                title="Ir a la última página"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
