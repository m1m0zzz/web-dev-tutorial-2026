import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { signIn } from '../lib/auth'
import { sessionKey } from '../hooks/useSession'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await signIn({ email, password })
      await queryClient.invalidateQueries({ queryKey: sessionKey })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました')
    }
  }

  return (
    <main>
      <h1>ログイン</h1>
      <form className="post-form" onSubmit={handleSubmit}>
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error !== null && <p role="alert">{error}</p>}

        <button type="submit">ログイン</button>
      </form>
      <p>
        アカウントがない場合は <Link to="/signup">新規登録</Link>
      </p>
    </main>
  )
}
