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
  selectedRecord = null, // Pass the currently selected record
}) {
  const [sorting, setSorting] = React.useState([])
  const [columnFilters, setColumnFilters] = React.useState([])
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Handle row selection changes - actualizar estado local
  const handleRowSelectionChange = React.useCallback((updaterOrValue) => {
    setRowSelection(prevSelection => {
      const newSelection = typeof updaterOrValue === 'function'
        ? updaterOrValue(prevSelection)
        : updaterOrValue;

      return newSelection;
    });
  }, []);

  // Add selection column if row selection is enabled
  const columnsWithSelection = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    
    const selectionColumn = {
      id: "select",
      header: ({ table }) => (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          borderRight: '2px solid var(--color-primary-300)',
          marginRight: '12px',
          paddingRight: '8px',
          background: 'var(--color-primary-50)'
        }}>
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={(e) => {
              e.stopPropagation();
              table.toggleAllPageRowsSelected(e.target.checked);
              // NO notificar al parent para evitar recargas múltiples
            }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          borderRight: '2px solid var(--color-primary-200)',
          marginRight: '12px',
          paddingRight: '8px',
          background: 'var(--color-neutral-50)'
        }}>
          <Checkbox
            checked={row.getIsSelected()}
            onClick={(e) => {
              e.stopPropagation(); // Prevenir que el click se propague al row
            }}
            onChange={(e) => {
              const isSelected = e.target.checked;
              row.toggleSelected(isSelected);
              // Notificar al padre sobre la selección/deselección
              if (onRowSelect) {
                onRowSelect(row.original, isSelected);
              }
            }}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50, // Fixed width for selection column
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
    onRowSelectionChange: handleRowSelectionChange,
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
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(e) => {
                    // Prevent click if clicking on checkbox directly
                    if (e.target.type === 'checkbox') return;

                    // Si el registro ya está seleccionado, ir al formulario
                    if (row.getIsSelected()) {
                      if (onRowDoubleClick) {
                        onRowDoubleClick(row.original);
                      }
                    } else {
                      // Si no está seleccionado, activar su checkbox (primer click)
                      row.toggleSelected(true);
                      // Notificar al padre sobre la selección
                      if (onRowSelect) {
                        onRowSelect(row.original, true);
                      }
                    }
                  }}
                  onDoubleClick={(e) => {
                    // Prevent double click if clicking on checkbox
                    if (e.target.type === 'checkbox') return;
                    // El doble click siempre va al formulario
                    if (onRowDoubleClick) onRowDoubleClick(row.original);
                  }}
                  style={{
                    cursor: (onRowClick || onRowDoubleClick) ? 'pointer' : 'default',
                    backgroundColor: rowIndex % 2 === 0 ? 'white' : 'var(--color-neutral-50)',
                  }}
                  className={(onRowClick || onRowDoubleClick) ? "hover:bg-primary-50" : ""}
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

// Exportar también el componente memoizado con comparación personalizada
export const MemoizedDataTable = React.memo(DataTable, (prevProps, nextProps) => {
  // Solo re-renderizar si las props realmente importantes han cambiado
  return (
    prevProps.columns === nextProps.columns &&
    prevProps.data === nextProps.data &&
    prevProps.searchable === nextProps.searchable &&
    prevProps.pagination === nextProps.pagination &&
    prevProps.pageSize === nextProps.pageSize &&
    prevProps.enableRowSelection === nextProps.enableRowSelection &&
    // Para selectedRecord, comparar por ID en lugar de referencia
    (prevProps.selectedRecord?.id === nextProps.selectedRecord?.id) &&
    // Para las funciones, solo comparar si son las mismas referencias
    prevProps.onRowClick === nextProps.onRowClick &&
    prevProps.onRowDoubleClick === nextProps.onRowDoubleClick &&
    prevProps.onRowSelect === nextProps.onRowSelect
  );
});
