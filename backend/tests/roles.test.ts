import { describe, expect, it } from 'vitest';
import {
  canChangeRoles,
  canEditInventory,
  canManageUsers,
  callerHasManagerAccess,
  callerIsOwner,
  groupsFromApiGatewayEvent,
  hasMinimumRole,
  parseCognitoGroups,
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

describe('parseCognitoGroups (API Gateway claim shapes)', () => {
  it('parses JSON string array from API Gateway', () => {
    expect(parseCognitoGroups('["Owner"]')).toEqual(['Owner']);
    expect(parseCognitoGroups('["Manager","Owner"]')).toEqual(['Manager', 'Owner']);
  });

  it('parses plain Owner string and arrays', () => {
    expect(parseCognitoGroups('Owner')).toEqual(['Owner']);
    expect(parseCognitoGroups(['Owner'])).toEqual(['Owner']);
  });

  it('gives Manager access to Owner-only users', () => {
    expect(callerHasManagerAccess(parseCognitoGroups('["Owner"]'))).toBe(true);
    expect(callerHasManagerAccess(parseCognitoGroups('["Manager"]'))).toBe(true);
    expect(callerHasManagerAccess(parseCognitoGroups('["ReadOnly"]'))).toBe(false);
  });

  it('recognizes Owner for Square requireOwner path', () => {
    expect(callerIsOwner(parseCognitoGroups('["Owner"]'))).toBe(true);
    expect(callerIsOwner(parseCognitoGroups('Owner'))).toBe(true);
  });
});

describe('groupsFromApiGatewayEvent', () => {
  it('falls back to Bearer ID token when authorizer claims are empty', () => {
    const payload = Buffer.from(JSON.stringify({ 'cognito:groups': ['Owner'] })).toString(
      'base64url',
    );
    const token = `hdr.${payload}.sig`;
    const groups = groupsFromApiGatewayEvent({
      requestContext: { authorizer: { jwt: { claims: {} } } },
      headers: { authorization: `Bearer ${token}` },
    });
    expect(groups).toEqual(['Owner']);
    expect(callerIsOwner(groups)).toBe(true);
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
