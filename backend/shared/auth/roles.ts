export type UserRole = 'ReadOnly' | 'Manager' | 'Owner';

const ROLE_HIERARCHY: UserRole[] = ['ReadOnly', 'Manager', 'Owner'];

export function resolveRoleFromGroups(groups: string[]): UserRole {
  if (groups.includes('Owner')) return 'Owner';
  if (groups.includes('Manager')) return 'Manager';
  return 'ReadOnly';
}

export function hasMinimumRole(current: UserRole, required: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(current) >= ROLE_HIERARCHY.indexOf(required);
}

export function canEditInventory(role: UserRole): boolean {
  return hasMinimumRole(role, 'Manager');
}

export function canManageUsers(role: UserRole): boolean {
  return hasMinimumRole(role, 'Manager');
}

export function canChangeRoles(role: UserRole): boolean {
  return role === 'Owner';
}