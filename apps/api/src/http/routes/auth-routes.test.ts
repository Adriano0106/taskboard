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
        role: 'OWNER',
      },
    })
    expect(response.json().token).toEqual(expect.any(String))

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
