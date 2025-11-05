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

  // Update row selection when selectedRecord changes (but avoid infinite loops)
  React.useEffect(() => {
    if (selectedRecord && data.length > 0) {
      // Find the row index of the selected record
      const rowIndex = data.findIndex(row => row.id === selectedRecord.id);
      if (rowIndex !== -1) {
        // Only update if the selection is actually different
        const newSelection = { [rowIndex]: true };
        setRowSelection(prevSelection => {
          if (JSON.stringify(prevSelection) !== JSON.stringify(newSelection)) {
            return newSelection;
          }
          return prevSelection;
        });
      }
    } else if (!selectedRecord) {
      setRowSelection(prevSelection => {
        if (Object.keys(prevSelection).length > 0) {
          return {};
        }
        return prevSelection;
      });
    }
  }, [selectedRecord, data]);

  // Handle row selection changes
  const handleRowSelectionChange = React.useCallback((updaterOrValue) => {
    setRowSelection(prevSelection => {
      const newSelection = typeof updaterOrValue === 'function' 
        ? updaterOrValue(prevSelection) 
        : updaterOrValue;
      
      // Only update if selection actually changed
      if (JSON.stringify(newSelection) !== JSON.stringify(prevSelection)) {
        // Notify parent component about selection changes
        if (onRowSelect) {
          const selectedRowIndex = Object.keys(newSelection).find(key => newSelection[key]);
          if (selectedRowIndex !== undefined) {
            const selectedRow = data[parseInt(selectedRowIndex)];
            onRowSelect(selectedRow, true);
          } else {
            onRowSelect(null, false);
          }
        }
        return newSelection;
      }
      return prevSelection;
    });
  }, [onRowSelect, data]);

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
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
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
            onChange={(e) => {
              row.toggleSelected(e.target.checked);
            }}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50, // Fixed width for selection column
    };
    
    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

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
                    // Prevent click if clicking on checkbox
                    if (e.target.type === 'checkbox') return;
                    if (onRowClick) onRowClick(row.original);
                  }}
                  onDoubleClick={(e) => {
                    // Prevent double click if clicking on checkbox
                    if (e.target.type === 'checkbox') return;
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
