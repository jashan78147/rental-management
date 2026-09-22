import { NextResponse } from "next/server";
import { BRAND } from "@/lib/data/seed";
import { PERIODS, reportBundle, type PeriodKey } from "@/lib/domain/reports";
import { loadDataset } from "@/lib/data/persist";

export const runtime = "nodejs";

type Row = (string | number)[];

interface Sheet {
  name: string;
  header: Row;
  rows: Row[];
}

async function sheets(period: PeriodKey): Promise<Sheet[]> {
  const bundle = reportBundle(await loadDataset(), period);
  const h = bundle.headline;

  return [
    {
      name: "Summary",
      header: ["Measure", "Value"],
      rows: [
        ["Period", bundle.period.label],
        ["Generated", new Date().toISOString()],
        ["Booked revenue (INR)", h.revenue],
        ["Booked orders", h.bookedOrders],
        ["Open quotations", h.quotationCount],
        ["Open quotation value (INR)", h.quotationValue],
        ["Quote to order conversion (%)", h.conversionRate],
        ["Units on hire now", h.unitsOnHire],
        ["Active fleet utilisation (%)", h.utilisation],
        ["Returned on time (%)", h.onTimeRate],
        ["Late fees billed (INR)", h.lateFees],
      ],
    },
    {
      name: "Most rented",
      header: ["Product", "Category", "Orders", "Units out", "Revenue (INR)", "Utilisation (%)"],
      rows: bundle.products.map((p) => [
        p.name,
        p.category,
        p.timesRented,
        p.unitsOut,
        p.revenue,
        p.utilisation,
      ]),
    },
    {
      name: "Top customers",
      header: ["Customer", "Segment", "City", "Orders", "Revenue (INR)", "Late returns"],
      rows: bundle.customers.map((c) => [
        c.name,
        c.segment,
        c.city,
        c.orders,
        c.revenue,
        c.lateReturns,
      ]),
    },
    {
      name: "Revenue trend",
      header: ["Period start", "Revenue (INR)", "Orders"],
      rows: bundle.trend.map((t) => [t.label, t.revenue, t.orders]),
    },
    {
      name: "Category mix",
      header: ["Category", "Revenue (INR)", "Share (%)"],
      rows: bundle.categories.map((c) => [c.category, c.revenue, c.share]),
    },
    {
      name: "Late returns",
      header: ["Order", "Customer", "Due", "Returned", "Hours late", "Fee (INR)"],
      rows: bundle.late.map((l) => [
        l.reference,
        l.customer,
        l.dueAt,
        l.returnedAt ?? "Not back yet",
        l.hoursLate,
        l.fee,
      ]),
    },
  ];
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(data: Sheet[]): string {
  return data
    .map(
      (sheet) =>
        [
          `# ${sheet.name}`,
          sheet.header.map(csvCell).join(","),
          ...sheet.rows.map((row) => row.map(csvCell).join(",")),
        ].join("\n"),
    )
    .join("\n\n");
}

async function toXlsx(data: Sheet[]): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();

  for (const sheet of data) {
    const grid = XLSX.utils.aoa_to_sheet([sheet.header, ...sheet.rows]);
    // Excel caps sheet names at 31 characters.
    XLSX.utils.book_append_sheet(book, grid, sheet.name.slice(0, 31));
  }

  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function toPdf(data: Sheet[], periodLabel: string): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(18);
  doc.text(`${BRAND.name} rental report`, 40, 44);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${periodLabel} , generated ${new Date().toLocaleString("en-IN")}`,
    40,
    62,
  );

  let cursor = 84;

  for (const sheet of data) {
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(sheet.name, 40, cursor);

    autoTable(doc, {
      startY: cursor + 8,
      head: [sheet.header.map(String)],
      body: sheet.rows.map((row) => row.map(String)),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [168, 68, 28], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 245, 240] },
      margin: { left: 40, right: 40 },
    });

    const table = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    cursor = (table?.finalY ?? cursor) + 34;

    if (cursor > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      cursor = 56;
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const requested = url.searchParams.get("period") ?? "90d";
  const period = (PERIODS.find((p) => p.key === requested)?.key ?? "90d") as PeriodKey;
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  const data = await sheets(period);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `bandobast-report-${period}-${stamp}`;

  try {
    if (format === "xlsx") {
      const buffer = await toXlsx(data);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${base}.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      const buffer = await toPdf(data, periodLabel);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${base}.pdf"`,
        },
      });
    }

    return new NextResponse(toCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Could not build the ${format.toUpperCase()} export.`,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
