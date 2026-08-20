import { Navigate, Route, Routes } from 'react-router'
import { useSession, useSignOut } from './hooks/useSession'
import { LoginPage } from './pages/LoginPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { PostListPage } from './pages/PostListPage'
import { SignUpPage } from './pages/SignUpPage'

function Header() {
  const { data: user } = useSession()
  const signOut = useSignOut()

  if (user === null || user === undefined) return null

  return (
    <header className="app-header">
      <span>{user.name}</span>
      <button onClick={signOut}>ログアウト</button>
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <PostListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/posts/:id"
          element={
            <RequireAuth>
              <PostDetailPage />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  )
}

export default App
