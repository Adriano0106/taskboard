import type { CompanyRole } from '@prisma/client'

export interface CompanyWorkspace {
  id: string
  name: string
  slug: string
  theme: CompanyTheme
  role: string
  permissions: string[]
  departments: Array<{
    id: string
    key: string
    name: string
    boards: Array<{
      id: string
      key: string
      name: string
      description: string | null
    }>
  }>
}

export interface CompanyTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  boardBackgroundColor: string
}

export interface PlatformCompanySummary {
  id: string
  name: string
  memberCount: number
  departmentCount: number
  boardCount: number
  createdAt: string
}

export interface CompanyMemberSummary {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

export interface CompanyMutationInput {
  companyId: string
  userId: string
}

export interface CreateCompanyMemberInput extends CompanyMutationInput {
  name: string
  email: string
  password: string
  role: CompanyRole
}

export interface UpdateCompanyMemberInput extends CompanyMutationInput {
  memberUserId: string
  role: CompanyRole
}

export interface UpdateCompanyMemberStatusInput extends CompanyMutationInput {
  memberUserId: string
  isActive: boolean
}

export interface UpdateCompanyInput extends CompanyMutationInput {
  name: string
  slug: string
  theme?: CompanyTheme
}

export interface CreateDepartmentInput extends CompanyMutationInput {
  name: string
}

export interface UpdateDepartmentInput extends CompanyMutationInput {
  departmentId: string
  name: string
}

export interface DeleteDepartmentInput extends CompanyMutationInput {
  departmentId: string
}

export interface CreateBoardInput extends CompanyMutationInput {
  departmentId: string
  name: string
  description?: string | null
}

export interface UpdateBoardInput extends CompanyMutationInput {
  boardId: string
  name: string
  description?: string | null
}

export interface DeleteBoardInput extends CompanyMutationInput {
  boardId: string
}

export class CompanyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompanyError'
  }
}
