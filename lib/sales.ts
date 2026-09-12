/**
 * Shared monthly-sales calculation. Extracted from Reports' existing
 * per-calendar-month invoice bucketing so Home's "Sales this month" and
 * Reports' six-month chart never compute this two different ways.
 */

export interface MonthlySales {
  year: number;
  month: number; // 0-11
  label: string; // e.g. "Jun"
  invoiced: number;
  collected: number;
}

interface SalesInvoice {
  date: string;
  total: number;
  balance: number;
}

/**
 * Returns `monthsBack` calendar months of invoiced/collected totals, oldest
 * first, ending with the current calendar month (index monthsBack - 1).
 * "Invoiced" is the invoice's full total for the month it was raised in;
 * "collected" is total minus its current outstanding balance - this does
 * not touch or re-derive the invoice balance itself, which stays exactly
 * what the connector/API already computed.
 */
export function monthlySales(
  invoices: ReadonlyArray<SalesInvoice>,
  monthsBack: number,
  now: number = Date.now()
): MonthlySales[] {
  const reference = new Date(now);
  return Array.from({ length: monthsBack }, (_, index) => {
    const date = new Date(reference.getFullYear(), reference.getMonth() - (monthsBack - 1) + index, 1);
    const rows = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.date);
      return invoiceDate.getFullYear() === date.getFullYear() && invoiceDate.getMonth() === date.getMonth();
    });
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: date.toLocaleString('en-CA', { month: 'short' }),
      invoiced: rows.reduce((sum, invoice) => sum + invoice.total, 0),
      collected: rows.reduce((sum, invoice) => sum + invoice.total - invoice.balance, 0),
    };
  });
}

export interface SalesComparison {
  thisMonth: number;
  lastMonth: number;
  /**
   * Percent change vs last month, rounded to the nearest whole number.
   * null when last month had $0 in sales - a percentage change from zero is
   * undefined, not "0%" or "∞%", so it is represented honestly as no
   * comparison available rather than a manufactured number.
   */
  changePct: number | null;
}

/**
 * Compares this calendar month's invoiced total to the prior calendar
 * month's, using the same monthlySales() bucketing Reports' chart uses.
 */
export function compareSalesToPriorMonth(invoices: ReadonlyArray<SalesInvoice>, now: number = Date.now()): SalesComparison {
  const [lastMonth, thisMonth] = monthlySales(invoices, 2, now);
  const changePct = lastMonth.invoiced > 0
    ? Math.round(((thisMonth.invoiced - lastMonth.invoiced) / lastMonth.invoiced) * 100)
    : (thisMonth.invoiced > 0 ? null : 0);
  return { thisMonth: thisMonth.invoiced, lastMonth: lastMonth.invoiced, changePct };
}
