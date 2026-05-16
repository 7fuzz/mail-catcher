'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '../../components/molecules/ThemeToggle'
import { Button } from '../../components/atoms/Button'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid credentials')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md p-8 bg-bg-card rounded-lg shadow-xl border border-border-subtle">
        <h1 className="text-2xl font-bold mb-6 text-center text-text-main">Mail Catcher Login</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-text-muted mb-2 text-sm font-medium">Username</label>
            <input
              type="text"
              className="w-full p-2 border border-border-subtle rounded bg-bg-main text-text-main focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-text-muted mb-2 text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full p-2 border border-border-subtle rounded bg-bg-main text-text-main focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
          >
            Login
          </Button>
        </form>
        <div className="mt-6 text-center text-xs text-text-muted">
          Default: admin / admin
        </div>
      </div>
    </div>
  )
}
