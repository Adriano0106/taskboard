export type CompanyPermission =
  | 'ManageWorkspace'
  | 'DeleteBoard'
  | 'ManageColumns'
  | 'CreateTask'
  | 'EditTask'
  | 'MoveTask'
  | 'CommentTask'
  | 'ManageTaskWatchers'
  | 'ManageTaskAttachments'

export function hasCompanyPermission(
  permissions: CompanyPermission[] | undefined,
  permission: CompanyPermission,
) {
  return Boolean(permissions?.includes(permission))
}
