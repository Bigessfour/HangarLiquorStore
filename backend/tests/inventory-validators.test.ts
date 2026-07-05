import { describe, expect, it } from 'vitest';
import {
  validateCreateInput,
  validateImportRows,
  validateScanInput,
  validateSyncActions,
  validateUpdateInput,
} from '../lambdas/inventory/lib/validators';

describe('inventory validators', () => {
  it('validates create input', () => {
    const result = validateCreateInput({
      upc: '071984000012',
      name: 'Coors Light 12pk',
      category: 'Beer',
      quantity: 2,
    });

    expect(result).toEqual({
      upc: '071984000012',
      name: 'Coors Light 12pk',
      category: 'Beer',
      quantity: 2,
      reorderPoint: undefined,
    });
  });

  it('rejects invalid UPC', () => {
    expect(() =>
      validateCreateInput({ upc: '123', name: 'Test', category: 'Beer', quantity: 1 }),
    ).toThrow('UPC must be 8–14 digits');
  });

  it('validates update input', () => {
    const result = validateUpdateInput({ name: 'Updated Name', currentStock: 10 }, '071984000012');
    expect(result).toEqual({
      upc: '071984000012',
      name: 'Updated Name',
      currentStock: 10,
    });
  });

  it('validates scan input with default delta', () => {
    expect(validateScanInput({ upc: '071984000012' })).toEqual({
      upc: '071984000012',
      delta: -1,
    });
  });

  it('validates import rows', () => {
    const result = validateImportRows({
      rows: [
        {
          upc: '071984000012',
          name: 'Coors Light',
          category: 'Beer',
          currentStock: 24,
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Coors Light');
  });

  it('validates sync actions', () => {
    const result = validateSyncActions({
      actions: [
        {
          id: 'a1',
          type: 'add',
          payload: {
            upc: '071984000012',
            quantity: 3,
            name: 'Coors Light',
            category: 'Beer',
          },
          timestamp: Date.now(),
        },
      ],
    });

    expect(result[0]?.type).toBe('add');
    expect(result[0]?.payload.quantity).toBe(3);
  });
});
