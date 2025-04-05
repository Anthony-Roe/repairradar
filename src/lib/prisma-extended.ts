// src/lib/prisma-session.ts
import { PrismaClient, Session, Tenant, User } from '@prisma/client'
import { cookies } from 'next/headers'
import { randomBytes } from 'node:crypto'

export interface SessionWithUser extends Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
  user: User & {
    tenant: Tenant | null
  }
}

// Session configuration
const SESSION_DURATION_DAYS = 30
const SESSION_TOKEN_BYTES = 64
const SESSION_COOKIE_NAME = 'session-token'

// Replace crypto.randomBytes with this:
function generateSecureToken(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export default function sessionExtension(prisma: PrismaClient) {
  return prisma.$extends({
    model: {
      session: {
        async create(data: {
          userId: string
          expires?: Date
        }): Promise<SessionWithUser> {
          try {
            const sessionToken = generateSecureToken(SESSION_TOKEN_BYTES)
            const expires = data.expires || new Date()
            expires.setDate(expires.getDate() + SESSION_DURATION_DAYS)

            const session = await prisma.session.create({
              data: {
                sessionToken,
                userId: data.userId,
                expires,
              },
              include: {
                user: {
                  include: {
                    tenant: true
                  }
                }
              }
            })
            
            const cookieStore = (await cookies());
            // Set HTTP-only cookie
            cookieStore.set({
              name: SESSION_COOKIE_NAME,
              value: sessionToken,
              expires,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })

            return session
          } catch (error) {
            console.error('Failed to create session:', error)
            throw new Error('SESSION_CREATION_FAILED')
          }
        },

        async findSessionByToken(sessionToken?: string): Promise<SessionWithUser | null> {
          try {
            const token = sessionToken || (await cookies()).get(SESSION_COOKIE_NAME)?.value
            if (!token) return null

            return await prisma.session.findUnique({
              where: { sessionToken: token },
              include: {
                user: {
                  include: {
                    tenant: true
                  }
                }
              }
            })
          } catch (error) {
            console.error('Failed to find session:', error)
            return null
          }
        },

        async deleteSession(sessionToken?: string): Promise<void> {
          try {
            const token = sessionToken || (await cookies()).get(SESSION_COOKIE_NAME)?.value
            if (!token) return

            await prisma.session.delete({
              where: { sessionToken: token }
            });

            // Clear cookie
            (await cookies()).delete(SESSION_COOKIE_NAME);
          } catch (error) {
            console.error('Failed to delete session:', error)
            throw new Error('SESSION_DELETION_FAILED')
          }
        },

        async rotateSession(): Promise<SessionWithUser> {
          try {
            const cookieStore = await cookies()
            const oldToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
            if (!oldToken) throw new Error('NO_SESSION_TOKEN')

            const newToken = generateSecureToken(SESSION_TOKEN_BYTES)
            const expires = new Date()
            expires.setDate(expires.getDate() + SESSION_DURATION_DAYS)

            const session = await prisma.session.update({
              where: { sessionToken: oldToken },
              data: {
                sessionToken: newToken,
                expires,
                updatedAt: new Date()
              },
              include: {
                user: {
                  include: {
                    tenant: true
                  }
                }
              }
            })

            // Update cookie with new token
            cookieStore.set({
              name: SESSION_COOKIE_NAME,
              value: newToken,
              expires,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })

            return session
          } catch (error) {
            console.error('Failed to rotate session:', error)
            throw new Error('SESSION_ROTATION_FAILED')
          }
        },

        async cleanExpiredSessions(): Promise<{ count: number }> {
          try {
            return await prisma.session.deleteMany({
              where: {
                expires: {
                  lt: new Date()
                }
              }
            })
          } catch (error) {
            console.error('Failed to clean expired sessions:', error)
            return { count: 0 }
          }
        },

        async validateSession(
          sessionToken?: string
        ): Promise<{ isValid: boolean; session?: SessionWithUser }> {
          try {
            const token = sessionToken || (await cookies()).get(SESSION_COOKIE_NAME)?.value
            if (!token) return { isValid: false }

            const session = await prisma.session.findUnique({
              where: { sessionToken: token },
              include: {
                user: {
                  include: {
                    tenant: true
                  }
                }
              }
            })

            if (!session) return { isValid: false }
            if (session.expires < new Date()) {
              await prisma.session.delete({ where: { sessionToken: token } });
              (await cookies()).delete(SESSION_COOKIE_NAME);
              return { isValid: false }
            }

            return { isValid: true, session }
          } catch (error) {
            console.error('Session validation failed:', error)
            return { isValid: false }
          }
        },

        async updateSessionData(
          data: Partial<Pick<Session, 'expires'>>,
          sessionToken?: string
        ): Promise<SessionWithUser | null> {
          try {
            const token = sessionToken || (await cookies()).get(SESSION_COOKIE_NAME)?.value;
            if (!token) return null

            return await prisma.session.update({
              where: { sessionToken: token },
              data: {
                ...data,
                updatedAt: new Date()
              },
              include: {
                user: {
                  include: {
                    tenant: true
                  }
                }
              }
            })
          } catch (error) {
            console.error('Failed to update session data:', error)
            return null
          }
        }
      }
    }
  })
}