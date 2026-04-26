import { z } from "zod";
import { parseAmountToKobo } from "@/lib/utils/schedule";

export const scheduleRowSchema = z.object({
  amount: z.number().positive().finite(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const planCreateBodySchema = z.object({
  customerPhone: z.string().min(8),
  customerEmail: z.string().email(),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentMethod: z.enum(["card", "bank"]),
  schedule: z.array(scheduleRowSchema).min(1).max(60),
});

export function validateScheduleBusinessRules(
  schedule: { amount: number; due_date: string }[],
  totalAmountStr: string
): string | null {
  const totalKobo = parseAmountToKobo(totalAmountStr);
  if (totalKobo === null || totalKobo <= 0) return "Invalid total amount";

  let sumKobo = 0;
  const dates = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  for (const row of schedule) {
    const k = Math.round(row.amount * 100);
    if (!Number.isFinite(k) || k <= 0) return "Each installment must be a positive amount";
    sumKobo += k;
    if (dates.has(row.due_date)) return "Duplicate due dates are not allowed";
    dates.add(row.due_date);
    if (row.due_date < today) return "All due dates must be today or later";
  }

  if (sumKobo !== totalKobo) return "Installment amounts must add up to the total amount";
  return null;
}
