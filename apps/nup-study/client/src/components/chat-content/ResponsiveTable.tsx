import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className="my-4 rounded-lg border border-border/50 bg-secondary/10 dark:bg-secondary/5">
      <ScrollArea className="w-full">
        <div className="min-w-full overflow-x-auto">
          <Table className={className}>
            {children}
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export function ResponsiveTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <TableHeader className="bg-secondary/30 dark:bg-secondary/20">
      {children}
    </TableHeader>
  );
}

export function ResponsiveTableRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-secondary/20 dark:hover:bg-secondary/10 transition-colors">
      {children}
    </TableRow>
  );
}

export function ResponsiveTableHead({ children }: { children: React.ReactNode }) {
  return (
    <TableHead className="font-semibold text-foreground whitespace-nowrap px-4 py-3">
      {children}
    </TableHead>
  );
}

export function ResponsiveTableCell({ children }: { children: React.ReactNode }) {
  return (
    <TableCell className="px-4 py-3">
      <div className="max-w-md break-words">
        {children}
      </div>
    </TableCell>
  );
}
