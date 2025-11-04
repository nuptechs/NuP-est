import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface InteractiveTableProps {
  headers: string[];
  rows: string[][];
}

export function InteractiveTable({ headers, rows }: InteractiveTableProps) {
  const columnDefs: ColDef[] = useMemo(() => {
    return headers.map((header) => ({
      field: header,
      headerName: header,
      filter: true,
      sortable: true,
      resizable: true,
      editable: false,
      minWidth: 120,
      flex: 1,
    }));
  }, [headers]);

  const rowData = useMemo(() => {
    return rows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }, [headers, rows]);

  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
  };

  return (
    <div className="my-4 rounded-lg border border-border overflow-hidden">
      <div 
        className="ag-theme-quartz dark:ag-theme-quartz-dark w-full" 
        style={{ height: Math.min(400, (rows.length + 1) * 42 + 10) }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          animateRows={true}
          rowSelection="multiple"
          suppressRowClickSelection={false}
          pagination={rows.length > 10}
          paginationPageSize={10}
          domLayout="normal"
        />
      </div>
      <div className="text-xs text-muted-foreground px-3 py-2 bg-muted/30 border-t border-border">
        💡 Dica: Clique nos cabeçalhos para ordenar • Use os filtros • Selecione células para copiar
      </div>
    </div>
  );
}
