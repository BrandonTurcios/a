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
  const tableRef = React.useRef(null)
  // Referencia para rastrear si el cambio de selección viene del usuario o del padre
  const isInternalSelectionChange = React.useRef(false)
  // Referencia para el último selectedRecord que notificamos al padre
  const lastNotifiedRecordRef = React.useRef(null)

  // Handle row selection changes - Notificar al parent cuando cambie la selección
  const handleRowSelectionChange = React.useCallback((updaterOrValue) => {
    // Marcar que este cambio es interno (del usuario)
    isInternalSelectionChange.current = true;
    
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
              // La notificación se hace automáticamente en el useEffect que observa rowSelection
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
              row.toggleSelected(e.target.checked);
              // La notificación se hace automáticamente en el useEffect que observa rowSelection
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
    // Usar el ID del registro como clave para preservar la selección cuando los datos cambian
    getRowId: (row) => {
      // Intentar usar 'id' primero, luego otros campos comunes
      return row.id?.toString() || row._id?.toString() || row.key?.toString() || String(row.index || Math.random());
    },
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

  // Guardar referencia de la tabla para usar en efectos
  React.useEffect(() => {
    tableRef.current = table;
  }, [table]);

  // Referencia para rastrear los IDs de datos anteriores
  const prevDataIdsRef = React.useRef(new Set());

  // Restaurar selección cuando los datos cambian (solo si realmente cambiaron)
  React.useEffect(() => {
    if (!enableRowSelection || !data || data.length === 0) {
      prevDataIdsRef.current = new Set();
      return;
    }

    // Obtener IDs actuales de los datos
    const currentDataIds = new Set(data.map(row => row.id?.toString()).filter(Boolean));
    
    // Verificar si los datos realmente cambiaron (comparar IDs)
    const dataChanged = 
      prevDataIdsRef.current.size !== currentDataIds.size ||
      Array.from(prevDataIdsRef.current).some(id => !currentDataIds.has(id)) ||
      Array.from(currentDataIds).some(id => !prevDataIdsRef.current.has(id));

    // Actualizar referencia
    prevDataIdsRef.current = currentDataIds;

    // Solo restaurar selección si los datos cambiaron Y hay un selectedRecord
    if (dataChanged && selectedRecord?.id) {
      // Usar un pequeño delay para asegurar que la tabla esté lista
      const timeoutId = setTimeout(() => {
        const rowToSelect = table.getRowModel().rows.find(
          row => row.original.id === selectedRecord.id
        );
        
        if (rowToSelect && !rowToSelect.getIsSelected()) {
          // Restaurar selección sin notificar (viene de recarga de datos)
          isInternalSelectionChange.current = false;
          rowToSelect.toggleSelected(true);
        }
      }, 10);

      return () => clearTimeout(timeoutId);
    }
  }, [data, enableRowSelection, selectedRecord?.id, table]);

  // Notificar al padre cuando cambie la selección (solo si el cambio viene del usuario)
  React.useEffect(() => {
    if (!enableRowSelection || !onRowSelect) return;
    
    // Solo notificar si el cambio viene del usuario (no del padre)
    if (!isInternalSelectionChange.current) {
      return;
    }
    
    // Resetear la bandera después de verificar
    isInternalSelectionChange.current = false;

    // Usar un pequeño delay para agrupar múltiples cambios de selección
    const timeoutId = setTimeout(() => {
      const selectedRows = table.getSelectedRowModel().rows;
      const selectedCount = selectedRows.length;
      let recordToNotify = null;
      let isSelected = false;

      if (selectedCount === 0) {
        // No hay selección - notificar null
        recordToNotify = null;
        isSelected = false;
      } else if (selectedCount === 1) {
        // Una sola selección - notificar ese registro
        recordToNotify = selectedRows[0].original;
        isSelected = true;
      } else {
        // Múltiples selecciones - notificar el último seleccionado
        // Esto es útil para que el toolbar sepa qué registro está activo
        const selectedRecords = selectedRows.map(row => row.original);
        recordToNotify = selectedRecords[selectedRecords.length - 1];
        isSelected = true;
      }

      // Solo notificar si el registro cambió (evitar notificaciones redundantes)
      const currentRecordId = recordToNotify?.id || null;
      const lastNotifiedId = lastNotifiedRecordRef.current?.id || null;
      
      if (currentRecordId !== lastNotifiedId) {
        lastNotifiedRecordRef.current = recordToNotify;
        onRowSelect(recordToNotify, isSelected);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [rowSelection, enableRowSelection, onRowSelect, table]);

  // Sincronizar selección cuando selectedRecord cambie desde el padre
  // Solo sincronizar si la selección actual no coincide con selectedRecord
  // IMPORTANTE: Este efecto solo se ejecuta cuando selectedRecord cambia externamente,
  // no cuando viene de nuestra propia notificación
  React.useEffect(() => {
    if (!enableRowSelection || !selectedRecord?.id) return;

    // Verificar si la selección ya es correcta
    const selectedRows = table.getSelectedRowModel().rows;
    const isCurrentlySelected = selectedRows.some(row => row.original.id === selectedRecord.id);
    
    // Si ya está seleccionado, no hacer nada (evitar ciclo)
    if (isCurrentlySelected) {
      return;
    }

    // Buscar la fila que corresponde al selectedRecord
    const rowToSelect = table.getRowModel().rows.find(
      row => row.original.id === selectedRecord.id
    );

    // Si encontramos la fila y no está seleccionada, seleccionarla
    // Marcar que este cambio NO viene del usuario para no notificar de vuelta
    if (rowToSelect) {
      isInternalSelectionChange.current = false;
      rowToSelect.toggleSelected(true);
    }
  }, [selectedRecord?.id, enableRowSelection, table]);

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
                      // La notificación se hace automáticamente en el useEffect que observa rowSelection
                      row.toggleSelected(true);
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
