import { describe, expect, it } from 'vitest'
import { buildApp } from '../../app.js'
import { createInMemoryUserRepository, seedUser } from '../../test/in-memory-user-repository.js'

describe('auth routes', () => {
  it('registers an account and returns an authenticated session', async () => {
    const userRepository = createInMemoryUserRepository()
    const app = await buildApp({
      jwtSecret: 'test-secret-with-enough-length',
      webOrigin: 'http://localhost:5173',
      userRepository,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Adriano Silva',
        email: 'adriano@example.com',
        password: 'password123',
        companyName: 'TaskBoard',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      user: {
        name: 'Adriano Silva',
        email: 'adriano@example.com',
      },
      company: {
        name: 'TaskBoard',
        slug: 'taskboard',
        role: 'OWNER',
        permissions: expect.arrayContaining(['ManageWorkspace', 'ManageColumns', 'CreateTask']),
      },
      isPlatformAdmin: false,
    })
    expect(response.json().token).toEqual(expect.any(String))

    await app.close()
  })

  it('marks configured platform admins in auth responses', async () => {
    const userRepository = createInMemoryUserRepository()
    await seedUser(userRepository, {
      name: 'Platform Admin',
      email: 'platform-admin@example.com',
      password: 'password123',
      companyName: 'TaskBoard',
    })

    const app = await buildApp({
      jwtSecret: 'test-secret-with-enough-length',
      platformAdminEmails: ['platform-admin@example.com'],
      webOrigin: 'http://localhost:5173',
      userRepository,
    })

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'platform-admin@example.com',
        password: 'password123',
      },
    })

    expect(loginResponse.statusCode).toBe(200)
    expect(loginResponse.json()).toMatchObject({
      user: {
        email: 'platform-admin@example.com',
      },
      isPlatformAdmin: true,
    })

    const profileResponse = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${loginResponse.json().token}`,
      },
    })

    expect(profileResponse.statusCode).toBe(200)
    expect(profileResponse.json()).toMatchObject({
      user: {
        email: 'platform-admin@example.com',
      },
      isPlatformAdmin: true,
    })

    await app.close()
  })

  it('rejects invalid login credentials', async () => {
    const userRepository = createInMemoryUserRepository()
    await seedUser(userRepository, {
      name: 'Adriano Silva',
      email: 'adriano@example.com',
      password: 'password123',
      companyName: 'TaskBoard',
    })

    const app = await buildApp({
      jwtSecret: 'test-secret-with-enough-length',
      webOrigin: 'http://localhost:5173',
      userRepository,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'adriano@example.com',
        password: 'wrong-password',
      },
    })

    expect(response.statusCode).toBe(401)

    await app.close()
  })

  it('blocks protected routes without a token', async () => {
    const userRepository = createInMemoryUserRepository()
    const app = await buildApp({
      jwtSecret: 'test-secret-with-enough-length',
      webOrigin: 'http://localhost:5173',
      userRepository,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
    })

    expect(response.statusCode).toBe(401)

    await app.close()
  })
})
