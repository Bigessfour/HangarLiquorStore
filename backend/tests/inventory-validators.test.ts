import { describe, expect, it } from 'vitest';
import {
  validateCreateInput,
  validateImportRows,
  validateScanInput,
  validateSyncActions,
  validateUpdateInput,
} from '../lambdas/inventory/lib/validators';

const baseCreate = {
  upc: '071984000012',
  name: 'Coors Light 12pk',
  category: 'Beer' as const,
  quantity: 2,
};

describe('validateCreateInput', () => {
  it('validates minimal create input', () => {
    expect(validateCreateInput(baseCreate)).toEqual({
      ...baseCreate,
      reorderPoint: undefined,
    });
  });

  it.each([
    '071984000012',
    '082184000012',
    '12345678',
    '12345678901234',
  ])('accepts valid UPC %s', (upc) => {
    expect(validateCreateInput({ ...baseCreate, upc }).upc).toBe(upc);
  });

  it.each(['123', '1234567', '123456789012345', 'abc', ''])('rejects UPC %j', (upc) => {
    expect(() => validateCreateInput({ ...baseCreate, upc })).toThrow('UPC must be 8–14 digits');
  });

  it.each(['Beer', 'Spirits', 'Wine', 'Mixers'] as const)('accepts category %s', (category) => {
    expect(validateCreateInput({ ...baseCreate, category }).category).toBe(category);
  });

  it.each(['Soda', 'Liquor', ''])('rejects category %j', (category) => {
    expect(() => validateCreateInput({ ...baseCreate, category })).toThrow('Invalid category');
  });

  it.each([1, 5, 100])('accepts quantity %s', (quantity) => {
    expect(validateCreateInput({ ...baseCreate, quantity }).quantity).toBe(quantity);
  });

  it.each([0, -1, 1.5, NaN])('rejects quantity %s', (quantity) => {
    expect(() => validateCreateInput({ ...baseCreate, quantity })).toThrow(
      'Quantity must be a positive integer',
    );
  });

  it.each([0, 10, 24])('accepts reorderPoint %s', (reorderPoint) => {
    expect(validateCreateInput({ ...baseCreate, reorderPoint }).reorderPoint).toBe(reorderPoint);
  });

  it.each([-1, 1.2])('rejects reorderPoint %s', (reorderPoint) => {
    expect(() => validateCreateInput({ ...baseCreate, reorderPoint })).toThrow(
      'Reorder point must be a non-negative integer',
    );
  });

  it.each([null, undefined, 42, 'x'])('rejects non-object body %#', (body) => {
    expect(() => validateCreateInput(body)).toThrow('Request body must be a JSON object');
  });
});

describe('validateUpdateInput', () => {
  it('validates partial update', () => {
    expect(validateUpdateInput({ name: 'Updated Name', currentStock: 10 }, '071984000012')).toEqual({
      upc: '071984000012',
      name: 'Updated Name',
      currentStock: 10,
    });
  });

  it('requires at least one field', () => {
    expect(() => validateUpdateInput({}, '071984000012')).toThrow(
      'At least one field to update is required',
    );
  });

  it.each([-1, 1.5])('rejects invalid stock %s', (currentStock) => {
    expect(() => validateUpdateInput({ currentStock }, '071984000012')).toThrow(
      'Current stock must be a non-negative integer',
    );
  });
});

describe('validateScanInput', () => {
  it('defaults delta to -1', () => {
    expect(validateScanInput({ upc: '071984000012' })).toEqual({ upc: '071984000012', delta: -1 });
  });

  it.each([-5, 0, 3, 12])('accepts delta %s', (delta) => {
    expect(validateScanInput({ upc: '071984000012', delta }).delta).toBe(delta);
  });

  it('rejects non-integer delta', () => {
    expect(() => validateScanInput({ upc: '071984000012', delta: 1.5 })).toThrow(
      'Delta must be an integer',
    );
  });
});

describe('validateImportRows', () => {
  const row = {
    upc: '071984000012',
    name: 'Coors Light',
    category: 'Beer' as const,
    currentStock: 24,
  };

  it('validates single row', () => {
    expect(validateImportRows({ rows: [row] })[0]?.name).toBe('Coors Light');
  });

  it('validates multiple rows', () => {
    expect(validateImportRows({ rows: [row, { ...row, upc: '018200000103', name: 'Bud Light' }] })).toHaveLength(2);
  });

  it.each([[], null])('rejects empty rows %#', (rows) => {
    expect(() => validateImportRows({ rows })).toThrow('rows must be a non-empty array');
  });
});

describe('validateSyncActions', () => {
  const addAction = {
    id: 'a1',
    type: 'add' as const,
    payload: { upc: '071984000012', quantity: 3, name: 'Coors Light', category: 'Beer' as const },
    timestamp: Date.now(),
  };

  it('validates add action', () => {
    expect(validateSyncActions({ actions: [addAction] })[0]?.type).toBe('add');
  });

  it.each(['add', 'adjust', 'sale'] as const)('accepts type %s', (type) => {
    const action = {
      ...addAction,
      type,
      payload: type === 'adjust' ? { upc: '071984000012', delta: -1 } : addAction.payload,
    };
    expect(validateSyncActions({ actions: [action] })[0]?.type).toBe(type);
  });

  it('rejects invalid action type', () => {
    expect(() =>
      validateSyncActions({ actions: [{ ...addAction, type: 'delete' }] }),
    ).toThrow('invalid type');
  });
});