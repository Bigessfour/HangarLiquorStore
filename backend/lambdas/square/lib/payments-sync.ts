import { squareFetch } from './client';

export interface PaymentsSyncResult {
  paymentsRead: number;
  paymentsGrossCents: number;
  paymentsCurrency: string;
}

export async function syncPayments(
  accessToken: string,
  locationId: string | undefined,
  lookbackDays = 90,
): Promise<PaymentsSyncResult> {
  const end = new Date();
  const start = new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  let paymentsRead = 0;
  let paymentsGrossCents = 0;
  let paymentsCurrency = 'USD';
  let cursor: string | undefined;

  do {
    const qs = new URLSearchParams({
      begin_time: start.toISOString(),
      end_time: end.toISOString(),
      limit: '100',
    });
    if (locationId) qs.set('location_id', locationId);
    if (cursor) qs.set('cursor', cursor);

    const page = await squareFetch<{
      payments?: Array<{
        status?: string;
        amount_money?: { amount?: number; currency?: string };
      }>;
      cursor?: string;
    }>(accessToken, `/v2/payments?${qs.toString()}`);

    for (const payment of page.payments ?? []) {
      if (payment.status && payment.status !== 'COMPLETED') continue;
      paymentsRead += 1;
      const amount = payment.amount_money?.amount ?? 0;
      paymentsGrossCents += amount;
      if (payment.amount_money?.currency) {
        paymentsCurrency = payment.amount_money.currency;
      }
    }

    cursor = page.cursor;
  } while (cursor);

  return { paymentsRead, paymentsGrossCents, paymentsCurrency };
}
