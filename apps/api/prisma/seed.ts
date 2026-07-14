import { type CompanyRole, PrismaClient, type ScopedRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const seedPassword = 'Teste@123456'

interface SeedUser {
  name: string
  email: string
  companyRole: CompanyRole
  departmentRole: ScopedRole
}

interface SeedCompany {
  name: string
  slug: string
  departmentName: string
  boardName: string
  boardKey: string
  users: SeedUser[]
}

const companies: SeedCompany[] = [
  createCompanySeed('Adri Corp', 'adri-corp', 'Tecnologia', 'Produto Digital', 'PROD', 'adri'),
  createCompanySeed('Nexux Corp', 'nexux-corp', 'Operacoes', 'Operacoes Internas', 'OPS', 'nexux'),
  createCompanySeed('Int Corp', 'int-corp', 'Projetos', 'Projetos Estrategicos', 'PRJ', 'int'),
]

async function main() {
  const passwordHash = await bcrypt.hash(seedPassword, 12)

  for (const companySeed of companies) {
    await prisma.$transaction(async (transaction) => {
      const company = await transaction.company.upsert({
        where: { slug: companySeed.slug },
        update: { name: companySeed.name },
        create: {
          name: companySeed.name,
          slug: companySeed.slug,
        },
      })

      let department = await transaction.department.findFirst({
        where: {
          companyId: company.id,
          name: companySeed.departmentName,
        },
      })

      department ??= await transaction.department.create({
        data: {
          companyId: company.id,
          name: companySeed.departmentName,
        },
      })

      const board = await transaction.board.upsert({
        where: {
          departmentId_key: {
            departmentId: department.id,
            key: companySeed.boardKey,
          },
        },
        update: {
          name: companySeed.boardName,
        },
        create: {
          departmentId: department.id,
          key: companySeed.boardKey,
          name: companySeed.boardName,
          description: `Board inicial da ${companySeed.name}`,
        },
      })

      const existingColumnCount = await transaction.boardColumn.count({
        where: { boardId: board.id },
      })

      if (existingColumnCount === 0) {
        await transaction.boardColumn.createMany({
          data: ['Backlog', 'Em andamento', 'Concluido'].map((name, position) => ({
            boardId: board.id,
            name,
            position,
          })),
        })
      }

      for (const userSeed of companySeed.users) {
        const user = await transaction.user.upsert({
          where: { email: userSeed.email },
          update: {
            name: userSeed.name,
            passwordHash,
          },
          create: {
            name: userSeed.name,
            email: userSeed.email,
            passwordHash,
          },
        })

        await transaction.companyMember.upsert({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: company.id,
            },
          },
          update: {
            role: userSeed.companyRole,
            isActive: true,
          },
          create: {
            userId: user.id,
            companyId: company.id,
            role: userSeed.companyRole,
            isActive: true,
          },
        })

        await transaction.departmentMember.upsert({
          where: {
            departmentId_userId: {
              departmentId: department.id,
              userId: user.id,
            },
          },
          update: { role: userSeed.departmentRole },
          create: {
            departmentId: department.id,
            userId: user.id,
            role: userSeed.departmentRole,
          },
        })
      }
    })
  }

  console.log(`Seed concluido: ${companies.length} empresas e 15 usuarios atualizados`)
}

function createCompanySeed(
  name: string,
  slug: string,
  departmentName: string,
  boardName: string,
  boardKey: string,
  emailPrefix: string,
): SeedCompany {
  return {
    name,
    slug,
    departmentName,
    boardName,
    boardKey,
    users: [
      {
        name: `Diretor ${name}`,
        email: `diretor@${emailPrefix}.local`,
        companyRole: 'OWNER',
        departmentRole: 'MANAGER',
      },
      {
        name: `Administrador ${name}`,
        email: `admin@${emailPrefix}.local`,
        companyRole: 'ADMIN',
        departmentRole: 'MANAGER',
      },
      {
        name: `Gestor ${name}`,
        email: `gestor@${emailPrefix}.local`,
        companyRole: 'MEMBER',
        departmentRole: 'MANAGER',
      },
      {
        name: `Colaborador Um ${name}`,
        email: `colaborador1@${emailPrefix}.local`,
        companyRole: 'MEMBER',
        departmentRole: 'MEMBER',
      },
      {
        name: `Colaborador Dois ${name}`,
        email: `colaborador2@${emailPrefix}.local`,
        companyRole: 'MEMBER',
        departmentRole: 'MEMBER',
      },
    ],
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
