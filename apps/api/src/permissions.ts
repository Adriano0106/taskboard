export type CompanyPermission =
  | 'ManageWorkspace'
  | 'ManageColumns'
  | 'CreateTask'
  | 'EditTask'
  | 'MoveTask'
  | 'CommentTask'
  | 'ManageTaskWatchers'
  | 'ManageTaskAttachments'

const rolePermissions: Record<string, CompanyPermission[]> = {
  OWNER: [
    'ManageWorkspace',
    'ManageColumns',
    'CreateTask',
    'EditTask',
    'MoveTask',
    'CommentTask',
    'ManageTaskWatchers',
    'ManageTaskAttachments',
  ],
  ADMIN: [
    'ManageWorkspace',
    'ManageColumns',
    'CreateTask',
    'EditTask',
    'MoveTask',
    'CommentTask',
    'ManageTaskWatchers',
    'ManageTaskAttachments',
  ],
  MEMBER: [
    'CreateTask',
    'EditTask',
    'MoveTask',
    'CommentTask',
    'ManageTaskWatchers',
    'ManageTaskAttachments',
  ],
}

export function getCompanyPermissions(role: string): CompanyPermission[] {
  return rolePermissions[role] ?? []
}

export function hasCompanyPermission(role: string, permission: CompanyPermission) {
  return getCompanyPermissions(role).includes(permission)
}

export function assertCompanyPermission(
  role: string,
  permission: CompanyPermission,
  createError: (message: string) => Error,
) {
  if (!hasCompanyPermission(role, permission)) {
    throw createError(`Missing permission: ${permission}`)
  }
}
