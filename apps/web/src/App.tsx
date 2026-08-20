import { Link, Navigate, Route, Routes } from 'react-router'
import { useSession, useSignOut } from './hooks/useSession'
import { LoginPage } from './pages/LoginPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { PostListPage } from './pages/PostListPage'
import { PublicPostsPage } from './pages/PublicPostsPage'
import { SignUpPage } from './pages/SignUpPage'
import { UserPage } from './pages/UserPage'

function Header() {
  const { data: user, isPending } = useSession()
  const signOut = useSignOut()

  if (isPending) return null

  return (
    <header className="app-header">
      <Link to="/public">公開メモ</Link>

      {user === null || user === undefined ? (
        <Link to="/login">ログイン</Link>
      ) : (
        <>
          <Link to="/">自分のメモ</Link>
          <span>{user.name}</span>
          <button onClick={signOut}>ログアウト</button>
        </>
      )}
    </header>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: user, isPending } = useSession()

  if (isPending) return <main>読み込み中…</main>
  if (user === null || user === undefined)
    return <Navigate to="/login" replace />

  return <>{children}</>
}

function App() {
  return (
    <>
      <Header />
      <Routes>
        {/* 未ログインでも見られるページ */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/public" element={<PublicPostsPage />} />
        <Route path="/users/:userId" element={<UserPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />

        {/* ログインが必要なページ */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <PostListPage />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  )
}

export default App
