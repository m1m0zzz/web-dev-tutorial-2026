import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { signUp } from '../lib/auth'
import { sessionKey } from '../hooks/useSession'

export function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await signUp({ email, password, name, userId })
      await queryClient.invalidateQueries({ queryKey: sessionKey })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました')
    }
  }

  return (
    <main>
      <h1>新規登録</h1>
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

        <label htmlFor="name">表示名</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label htmlFor="userId">
          ユーザー ID（英小文字・数字・ハイフン。あとから変更できません）
        </label>
        <input
          id="userId"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        {error !== null && <p role="alert">{error}</p>}

        <button type="submit">登録する</button>
      </form>
      <p>
        アカウントがある場合は <Link to="/login">ログイン</Link>
      </p>
    </main>
  )
}
