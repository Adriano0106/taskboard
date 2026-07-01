import bcrypt from 'bcryptjs'
import { getCompanyPermissions } from '../permissions.js'
import type { UserRepository, UserWithPrimaryCompany } from '../repositories/user-repository.js'
import type { AuthenticatedUser, PublicCompany, PublicUser } from '../types/auth.js'

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export interface RegisterAccountInput {
  name: string
  email: string
  password: string
  companyName: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthenticatedAccount {
  authenticatedUser: AuthenticatedUser
  publicUser: PublicUser
  publicCompany: PublicCompany
}

export function createAuthService(userRepository: UserRepository) {
  return {
    async registerAccount(input: RegisterAccountInput): Promise<AuthenticatedAccount> {
      const normalizedEmail = input.email.trim().toLowerCase()
      const existingUser = await userRepository.findByEmail(normalizedEmail)

      if (existingUser) {
        throw new AuthError('Email already registered')
      }

      const passwordHash = await bcrypt.hash(input.password, 12)
      const createdUser = await userRepository.createWithCompany({
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        companyName: input.companyName.trim(),
      })

      return mapUserToAuthenticatedAccount(createdUser)
    },
    async login(input: LoginInput): Promise<AuthenticatedAccount> {
      const normalizedEmail = input.email.trim().toLowerCase()
      const user = await userRepository.findByEmail(normalizedEmail)

      if (!user) {
        throw new AuthError('Invalid email or password')
      }

      const passwordMatches = await bcrypt.compare(input.password, user.passwordHash)

      if (!passwordMatches) {
        throw new AuthError('Invalid email or password')
      }

      return mapUserToAuthenticatedAccount(user)
    },
    async getProfile(userId: string): Promise<AuthenticatedAccount> {
      const user = await userRepository.findById(userId)

      if (!user) {
        throw new AuthError('User not found')
      }

      return mapUserToAuthenticatedAccount(user)
    },
  }
}

function mapUserToAuthenticatedAccount(user: UserWithPrimaryCompany): AuthenticatedAccount {
  const primaryMembership = user.memberships[0]

  if (!primaryMembership) {
    throw new AuthError('User does not belong to a company')
  }

  return {
    authenticatedUser: {
      userId: user.id,
      email: user.email,
      companyId: primaryMembership.company.id,
      role: primaryMembership.role,
    },
    publicUser: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    publicCompany: {
      id: primaryMembership.company.id,
      name: primaryMembership.company.name,
      slug: primaryMembership.company.slug,
      theme: {
        primaryColor: primaryMembership.company.themePrimaryColor,
        secondaryColor: primaryMembership.company.themeSecondaryColor,
        accentColor: primaryMembership.company.themeAccentColor,
        boardBackgroundColor: primaryMembership.company.themeBoardBackgroundColor,
      },
      role: primaryMembership.role,
      permissions: getCompanyPermissions(primaryMembership.role),
    },
  }
}
