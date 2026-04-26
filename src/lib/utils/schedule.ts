export type ScheduleRow = { amount: number; due_date: string };

export function parseAmountToKobo(s: string): number | null {
  const t = s.trim();
  const m = t.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const whole = parseInt(m[1], 10);
  const frac = m[2] ? parseInt(m[2].padEnd(2, "0").slice(0, 2), 10) : 0;
  return whole * 100 + frac;
}

export function koboToAmount(kobo: number): number {
  return Math.round(kobo) / 100;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

export function splitTotalKobo(totalKobo: number, n: number): number[] {
  if (n < 1) return [];
  const base = Math.floor(totalKobo / n);
  const rem = totalKobo - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

export function parseScheduleJsonForDisplay(
  scheduleJson: unknown,
  totalAmount: string | number
): ScheduleRow[] {
  if (Array.isArray(scheduleJson)) {
    const out: ScheduleRow[] = [];
    for (const r of scheduleJson) {
      if (r && typeof r === "object" && typeof (r as ScheduleRow).amount === "number" && typeof (r as ScheduleRow).due_date === "string") {
        out.push({ amount: (r as ScheduleRow).amount, due_date: (r as ScheduleRow).due_date });
      }
    }
    if (out.length) return out;
  }
  if (scheduleJson && typeof scheduleJson === "object") {
    const o = scheduleJson as Record<string, unknown>;
    if (o.type === "lump_sum" && typeof o.dueDate === "string") {
      return [{ amount: Number(totalAmount), due_date: o.dueDate }];
    }
    if (o.type === "installments" && Array.isArray(o.installments)) {
      return o.installments
        .map((x: { amount?: string; dueDate?: string }) => ({
          amount: parseFloat(String(x.amount ?? 0)),
          due_date: String(x.dueDate ?? ""),
        }))
        .filter((r) => r.due_date.length > 0);
    }
  }
  return [{ amount: Number(totalAmount), due_date: "" }];
}

export function generateEqualSchedule(
  totalKobo: number,
  count: number,
  firstDueDate: string,
  frequency: "weekly" | "monthly"
): ScheduleRow[] {
  const parts = splitTotalKobo(totalKobo, count);
  const rows: ScheduleRow[] = [];
  for (let i = 0; i < count; i++) {
    const due = i === 0 ? firstDueDate : frequency === "weekly" ? addDaysIso(firstDueDate, i * 7) : addMonthsIso(firstDueDate, i);
    rows.push({ amount: koboToAmount(parts[i]), due_date: due });
  }
  return rows;
}
