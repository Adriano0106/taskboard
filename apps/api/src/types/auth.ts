import type { CompanyPermission } from '../permissions.js'

export interface AuthenticatedUser {
  userId: string
  email: string
  companyId: string
  role: string
}

export interface PublicUser {
  id: string
  name: string
  email: string
}

export interface PublicCompany {
  id: string
  name: string
  role: string
  permissions: CompanyPermission[]
}

export interface AuthSession {
  user: PublicUser
  company: PublicCompany
  token: string
}
