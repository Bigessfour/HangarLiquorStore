import { describe, expect, it } from 'vitest';
import { validateCreateEventInput } from '../lambdas/forecast/lib/event-validators';

const valid = {
  name: 'Wiley Rodeo Weekend',
  startDate: '2026-07-10',
  endDate: '2026-07-12',
  multiplier: 1.5,
};

describe('validateCreateEventInput', () => {
  it('accepts valid event', () => {
    expect(validateCreateEventInput(valid)).toEqual(valid);
  });

  it.each([
    ['ab', 'Event name must be at least 3 characters'],
    ['', 'Event name must be at least 3 characters'],
    ['   ', 'Event name must be at least 3 characters'],
  ])('rejects short name %j', (name, message) => {
    expect(() => validateCreateEventInput({ ...valid, name })).toThrow(message);
  });

  it.each([
    [{ ...valid, startDate: '' }, 'Start and end dates are required'],
    [{ ...valid, endDate: '' }, 'Start and end dates are required'],
    [{ ...valid, startDate: '2026-07-15', endDate: '2026-07-10' }, 'End date must be on or after start date'],
  ])('rejects invalid dates %#', (input, message) => {
    expect(() => validateCreateEventInput(input)).toThrow(message);
  });

  it.each([0.4, 5.1, NaN, Infinity, -1])('rejects multiplier %s', (multiplier) => {
    expect(() => validateCreateEventInput({ ...valid, multiplier })).toThrow(
      'Multiplier must be between 0.5 and 5',
    );
  });

  it.each([0.5, 1, 2.5, 5])('accepts multiplier %s', (multiplier) => {
    expect(validateCreateEventInput({ ...valid, multiplier }).multiplier).toBe(multiplier);
  });

  it('preserves optional notes', () => {
    expect(validateCreateEventInput({ ...valid, notes: 'Beer spike' }).notes).toBe('Beer spike');
  });

  it('preserves valid focus tags and drops unknown', () => {
    expect(
      validateCreateEventInput({
        ...valid,
        focuses: ['Ice', 'Beer/RTD', 'NotARealTag'],
      }).focuses,
    ).toEqual(['Ice', 'Beer/RTD']);
  });

  it('omits empty focuses', () => {
    expect(validateCreateEventInput({ ...valid, focuses: [] }).focuses).toBeUndefined();
  });

  it.each([null, undefined, 'string', 42])('rejects non-object body %#', (body) => {
    expect(() => validateCreateEventInput(body)).toThrow('Request body must be a JSON object');
  });
});
