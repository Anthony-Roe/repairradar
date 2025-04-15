"use client"
// components/SessionWrapper.tsx
import { getSession, SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface SessionWrapperProps {
  children: ReactNode
  session: any // Adjust to the actual session type
}

const SessionWrapper = ({ children, session }: SessionWrapperProps) => {
  return (
    <>
      {/* You can add a condition here to show different UI if session is available */}
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </>
  )
}

export default SessionWrapper