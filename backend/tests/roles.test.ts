import { describe, expect, it } from 'vitest';
import {
  canChangeRoles,
  canEditInventory,
  canManageUsers,
  hasMinimumRole,
  resolveRoleFromGroups,
} from '../shared/auth/roles';

describe('resolveRoleFromGroups', () => {
  it.each([
    [['Owner'], 'Owner'],
    [['Manager'], 'Manager'],
    [['ReadOnly'], 'ReadOnly'],
    [[], 'ReadOnly'],
    [['Manager', 'ReadOnly'], 'Manager'],
    [['Owner', 'Manager'], 'Owner'],
    [['custom'], 'ReadOnly'],
  ] as const)('groups %j => %s', (groups, expected) => {
    expect(resolveRoleFromGroups([...groups])).toBe(expected);
  });
});

describe('hasMinimumRole', () => {
  it.each([
    ['ReadOnly', 'ReadOnly', true],
    ['ReadOnly', 'Manager', false],
    ['Manager', 'Manager', true],
    ['Manager', 'Owner', false],
    ['Owner', 'ReadOnly', true],
    ['Owner', 'Manager', true],
    ['Owner', 'Owner', true],
  ] as const)('%s needs %s => %s', (current, required, expected) => {
    expect(hasMinimumRole(current, required)).toBe(expected);
  });
});

describe('permission helpers', () => {
  it.each([
    ['ReadOnly', false, false, false],
    ['Manager', true, true, false],
    ['Owner', true, true, true],
  ] as const)('role %s edit=%s manage=%s changeRoles=%s', (role, edit, manage, change) => {
    expect(canEditInventory(role)).toBe(edit);
    expect(canManageUsers(role)).toBe(manage);
    expect(canChangeRoles(role)).toBe(change);
  });
});