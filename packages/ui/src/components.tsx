import { ArrowUpRight, Inbox, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card } from "./primitives";

export interface DataColumn<Row> {
  readonly key: keyof Row;
  readonly label: string;
  readonly render?: (row: Row) => ReactNode;
}
export function DataTable<Row extends { readonly id: string }>({
  columns,
  rows,
}: {
  readonly columns: readonly DataColumn<Row>[];
  readonly rows: readonly Row[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3 font-semibold" key={String(column.key)}>
                  {column.label}
                </th>
              ))}
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr className="transition hover:bg-muted/40" key={row.id}>
                {columns.map((column) => (
                  <td className="px-4 py-3.5" key={String(column.key)}>
                    {column.render?.(row) ?? String(row[column.key])}
                  </td>
                ))}
                <td>
                  <Button aria-label="Row actions" size="icon" variant="ghost">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
export function MetricCard({
  detail,
  label,
  trend,
  value,
}: {
  readonly detail: string;
  readonly label: string;
  readonly trend: string;
  readonly value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <ArrowUpRight className="size-4 text-primary" />
      </div>
      <strong className="mt-4 block text-3xl tracking-tight">{value}</strong>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <Badge className="border-primary/20 bg-primary/10 text-primary">{trend}</Badge>
        <span className="text-muted-foreground">{detail}</span>
      </div>
    </Card>
  );
}
export function EmptyState({
  action,
  description,
  title,
}: {
  readonly action?: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <Card className="grid min-h-64 place-items-center border-dashed p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Inbox className="size-5" />
        </span>
        <h3 className="mt-4 text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </Card>
  );
}
