import { useCallback, useState, type ReactNode } from 'react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useImportInventory } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  INVENTORY_CATEGORIES,
  csvImportRowSchema,
  type CsvImportRow,
  type InventoryCategory,
} from '@/types/inventory';

interface ImportCSVProps {
  trigger?: ReactNode;
}

function normalizeCategory(value: string): InventoryCategory {
  const normalized = value.trim().toLowerCase();
  const match = INVENTORY_CATEGORIES.find((c) => c.toLowerCase() === normalized);
  return match ?? 'Beer';
}

function parseCsvRows(results: Papa.ParseResult<Record<string, string>>): CsvImportRow[] {
  const parsed: CsvImportRow[] = [];

  for (const row of results.data) {
    const candidate = {
      upc: (row.upc ?? row.UPC ?? '').replace(/\D/g, ''),
      name: row.name ?? row.Name ?? row.product ?? row.Product ?? '',
      category: normalizeCategory(row.category ?? row.Category ?? 'Beer'),
      currentStock: Number(row.currentStock ?? row.stock ?? row.Stock ?? row.quantity ?? 0),
      reorderPoint: row.reorderPoint
        ? Number(row.reorderPoint)
        : row.reorder
          ? Number(row.reorder)
          : undefined,
    };

    const result = csvImportRowSchema.safeParse(candidate);
    if (result.success) {
      parsed.push(result.data);
    }
  }

  return parsed;
}

export function ImportCSV({ trigger }: ImportCSVProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isShipment, setIsShipment] = useState(false); // for bulk shipment / receiving: add instead of replace

  const importMutation = useImportInventory({
    onSuccess: (result) => {
      setImportMessage(`Imported ${result.imported} item${result.imported !== 1 ? 's' : ''}`);
      setRows([]);
      setTimeout(() => setOpen(false), 1500);
    },
    onError: (err) => {
      setImportMessage(err.message);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setParseError(null);
    setImportMessage(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = parseCsvRows(results);
        if (parsed.length === 0) {
          setParseError(
            'No valid rows found. CSV needs upc, name, category, currentStock columns.',
          );
          setRows([]);
          return;
        }
        setRows(parsed);
      },
      error: (err) => {
        setParseError(err.message);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.csv', '.txt'] },
    maxFiles: 1,
    multiple: false,
  });

  const updateRow = (index: number, field: keyof CsvImportRow, value: string | number) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    setImportMessage(null);
    const validation = rows.map((row) => csvImportRowSchema.safeParse(row));
    const invalid = validation.filter((r) => !r.success);
    if (invalid.length > 0) {
      setParseError(`${invalid.length} row(s) have validation errors. Fix before importing.`);
      return;
    }
    importMutation.mutate({ rows, isShipment });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        setIsShipment(false);
        setRows([]);
        setParseError(null);
        setImportMessage(null);
      }
    }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" className="min-h-12 gap-2">
            <Upload className="h-4 w-4" aria-hidden />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-hanger-amber" aria-hidden />
            Import inventory CSV
          </DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={cn(
            'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors',
            isDragActive
              ? 'border-hanger-amber bg-hanger-amber/10'
              : 'border-border bg-muted/50 hover:border-hanger-amber/50',
          )}
        >
          <input {...getInputProps()} aria-label="Upload CSV file" />
          <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-center text-sm font-medium">
            {isDragActive ? 'Drop CSV here' : 'Drag & drop a CSV file, or tap to browse'}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Columns: upc, name, category, currentStock, reorderPoint (optional), packSize (optional, default 1 for case-break)
          </p>
          <label className="flex items-center gap-2 text-xs mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isShipment}
              onChange={(e) => setIsShipment(e.target.checked)}
              className="h-4 w-4"
            />
            This is a shipment / receiving (ADD the quantities to current stock)
          </label>
        </div>

        {parseError && (
          <p className="text-sm text-destructive" role="alert">
            {parseError}
          </p>
        )}

        {rows.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UPC</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Cat.</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row.upc}-${index}`}>
                    <TableCell>
                      <Input
                        className="h-10 min-w-[7rem] text-xs"
                        value={row.upc}
                        onChange={(e) => updateRow(index, 'upc', e.target.value.replace(/\D/g, ''))}
                        aria-label={`Row ${index + 1} UPC`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-10 min-w-[8rem] text-xs"
                        value={row.name}
                        onChange={(e) => updateRow(index, 'name', e.target.value)}
                        aria-label={`Row ${index + 1} name`}
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-10 rounded-lg border border-input bg-background px-1 text-xs"
                        value={row.category}
                        onChange={(e) => updateRow(index, 'category', e.target.value)}
                        aria-label={`Row ${index + 1} category`}
                      >
                        {INVENTORY_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-10 w-16 text-xs"
                        type="number"
                        min={0}
                        value={row.currentStock}
                        onChange={(e) => updateRow(index, 'currentStock', Number(e.target.value))}
                        aria-label={`Row ${index + 1} stock`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-10 w-12 text-xs"
                        type="number"
                        min={1}
                        value={row.packSize ?? 1}
                        onChange={(e) => updateRow(index, 'packSize', Number(e.target.value))}
                        aria-label={`Row ${index + 1} packSize`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => removeRow(index)}
                        aria-label={`Remove row ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {importMessage && (
          <p
            className={cn(
              'text-sm',
              importMutation.isError ? 'text-destructive' : 'text-green-600',
            )}
            role="status"
          >
            {importMessage}
          </p>
        )}

        <Button
          type="button"
          className="min-h-12 w-full bg-gradient-to-r from-hanger-gold to-hanger-amber"
          disabled={rows.length === 0 || importMutation.isPending}
          onClick={handleImport}
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Importing…
            </>
          ) : (
            `Import to Hanger Inventory (${rows.length})`
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
