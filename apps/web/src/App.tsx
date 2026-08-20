import { Navigate, Outlet, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { useSession } from './hooks/useSession'
import { LoginPage } from './pages/LoginPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { PostListPage } from './pages/PostListPage'
import { PublicPostsPage } from './pages/PublicPostsPage'
import { SignUpPage } from './pages/SignUpPage'
import { UserPage } from './pages/UserPage'

function RequireAuth() {
  const { data: user, isPending } = useSession()

  if (isPending) return <main>読み込み中…</main>
  if (user === null || user === undefined)
    return <Navigate to="/login" replace />

  return <Outlet />
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 未ログインでも見られるページ */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/public" element={<PublicPostsPage />} />
        <Route path="/users/:userId" element={<UserPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />

        {/* ログインが必要なページ */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<PostListPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
