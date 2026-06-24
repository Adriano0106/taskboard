import type { CompanyRole, PrismaClient } from '@prisma/client'

export interface UserWithPrimaryCompany {
  id: string
  name: string
  email: string
  passwordHash: string
  memberships: Array<{
    role: CompanyRole
    company: {
      id: string
      name: string
    }
  }>
}

export interface CreateUserWithCompanyInput {
  name: string
  email: string
  passwordHash: string
  companyName: string
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithPrimaryCompany | null>
  findById(userId: string): Promise<UserWithPrimaryCompany | null>
  createWithCompany(input: CreateUserWithCompanyInput): Promise<UserWithPrimaryCompany>
}

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    findByEmail(email) {
      return prisma.user.findUnique({
        where: {
          email,
        },
        include: primaryCompanyInclude,
      })
    },
    findById(userId) {
      return prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: primaryCompanyInclude,
      })
    },
    createWithCompany(input) {
      return prisma.$transaction(async (transaction) => {
        const company = await transaction.company.create({
          data: {
            name: input.companyName,
          },
        })

        const user = await transaction.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash: input.passwordHash,
            memberships: {
              create: {
                companyId: company.id,
                role: 'OWNER',
              },
            },
          },
          include: primaryCompanyInclude,
        })

        return user
      })
    },
  }
}

const primaryCompanyInclude = {
  memberships: {
    orderBy: {
      createdAt: 'asc',
    },
    take: 1,
    include: {
      company: true,
    },
  },
} as const
