import type { CompanyRole, Prisma, PrismaClient } from '@prisma/client'
import { createCompanySlugFromName } from './company-slug.js'

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
      slug: string
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
        const slug = await createUniqueCompanySlug(transaction, input.companyName)
        const company = await transaction.company.create({
          data: {
            name: input.companyName,
            slug,
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

async function createUniqueCompanySlug(
  prisma: Prisma.TransactionClient | PrismaClient,
  value: string,
) {
  const baseSlug = createCompanySlugFromName(value)

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const suffixText = `-${suffix + 1}`
    const slug =
      suffix === 0 ? baseSlug : `${baseSlug.slice(0, 48 - suffixText.length)}${suffixText}`
    const existingCompany = await prisma.company.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    })

    if (!existingCompany) {
      return slug
    }
  }

  throw new Error('Could not create a unique company URL')
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
