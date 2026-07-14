import bcrypt from 'bcryptjs'
import type {
  CreateUserWithCompanyInput,
  UserRepository,
  UserWithPrimaryCompany,
} from '../repositories/user/user-repository.js'

export function createInMemoryUserRepository(): UserRepository {
  const users: UserWithPrimaryCompany[] = []

  return {
    async findByEmail(email) {
      return users.find((storedUser) => storedUser.email === email) ?? null
    },
    async findById(userId) {
      return users.find((storedUser) => storedUser.id === userId) ?? null
    },
    async createWithCompany(input: CreateUserWithCompanyInput) {
      const createdUser: UserWithPrimaryCompany = {
        id: `user-${users.length + 1}`,
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        memberships: [
          {
            role: 'OWNER',
            company: {
              id: `company-${users.length + 1}`,
              name: input.companyName,
              slug: input.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              themePrimaryColor: '#07182f',
              themeSecondaryColor: '#12335f',
              themeAccentColor: '#1d4ed8',
              themeBoardBackgroundColor: '#d9e6f2',
            },
          },
        ],
      }

      users.push(createdUser)

      return createdUser
    },
  }
}

export async function seedUser(
  userRepository: UserRepository,
  input: {
    name: string
    email: string
    password: string
    companyName: string
  },
) {
  await userRepository.createWithCompany({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 12),
    companyName: input.companyName,
  })
}
