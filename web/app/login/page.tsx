'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'

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
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
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
