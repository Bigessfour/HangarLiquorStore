import type { CreateLocalEventInput } from '../../../shared/types/forecast';

export function validateCreateEventInput(body: unknown): CreateLocalEventInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const name = String(input.name ?? '').trim();
  const startDate = String(input.startDate ?? '');
  const endDate = String(input.endDate ?? '');
  const multiplier = Number(input.multiplier);
  const notes = input.notes ? String(input.notes) : undefined;

  if (name.length < 3) throw new Error('Event name must be at least 3 characters');
  if (!startDate || !endDate) throw new Error('Start and end dates are required');
  if (endDate < startDate) throw new Error('End date must be on or after start date');
  if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 5) {
    throw new Error('Multiplier must be between 0.5 and 5');
  }

  return { name, startDate, endDate, multiplier, notes };
}