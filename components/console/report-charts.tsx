"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryRow, ProductRow, TrendPoint } from "@/lib/domain/reports";
import { money, moneyCompact } from "@/lib/format";

/* Single measure per chart, so each one carries a single hue rather than a
   cycled categorical palette. Identity is carried by the axis label. */
const INK_FAINT = "var(--ink-faint)";
const LINE = "var(--line)";

interface TipPayload {
  active?: boolean;
  payload?: { payload: Record<string, unknown> }[];
  label?: string | number;
}

function Tip({
  active,
  payload,
  label,
  rows,
}: TipPayload & { rows: (d: Record<string, unknown>) => [string, string][] }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;

  return (
    <div className="card px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-ink">{label ?? ""}</p>
      <dl className="tnum mt-1 space-y-0.5">
        {rows(datum).map(([key, value]) => (
          <div key={key} className="flex gap-3 text-sm">
            <dt className="text-ink-soft">{key}</dt>
            <dd className="ml-auto font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={LINE} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: LINE }}
            tick={{ fill: INK_FAINT, fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: INK_FAINT, fontSize: 12 }}
            tickFormatter={(value: number) => moneyCompact(value)}
          />
          <Tooltip
            cursor={{ fill: "var(--paper-sunken)" }}
            content={
              <Tip
                rows={(d) => [
                  ["Revenue", money(Number(d.revenue))],
                  ["Orders", String(d.orders)],
                ]}
              />
            }
          />
          <Bar dataKey="revenue" fill="var(--clay)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryMixChart({ data }: { data: CategoryRow[] }) {
  return (
    <div className="w-full" style={{ height: Math.max(180, data.length * 42) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          barCategoryGap="26%"
        >
          <CartesianGrid horizontal={false} stroke={LINE} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: INK_FAINT, fontSize: 12 }}
            tickFormatter={(value: number) => moneyCompact(value)}
          />
          <YAxis
            type="category"
            dataKey="category"
            tickLine={false}
            axisLine={false}
            width={132}
            tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--paper-sunken)" }}
            content={
              <Tip
                rows={(d) => [
                  ["Revenue", money(Number(d.revenue))],
                  ["Share", `${d.share}%`],
                ]}
              />
            }
          />
          <Bar dataKey="revenue" fill="var(--pine)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({ data }: { data: ProductRow[] }) {
  const rows = data.slice(0, 7);

  return (
    <div className="w-full" style={{ height: Math.max(180, rows.length * 42) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          barCategoryGap="26%"
        >
          <CartesianGrid horizontal={false} stroke={LINE} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: INK_FAINT, fontSize: 12 }}
            tickFormatter={(value: number) => moneyCompact(value)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={176}
            tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
            tickFormatter={(value: string) => (value.length > 26 ? `${value.slice(0, 26)}…` : value)}
          />
          <Tooltip
            cursor={{ fill: "var(--paper-sunken)" }}
            content={
              <Tip
                rows={(d) => [
                  ["Revenue", money(Number(d.revenue))],
                  ["Orders", String(d.timesRented)],
                  ["Units out", String(d.unitsOut)],
                ]}
              />
            }
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
            {rows.map((row) => (
              <Cell key={row.productId} fill="var(--clay)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
