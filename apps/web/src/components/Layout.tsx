import { Link, Outlet } from 'react-router'
import { useSession, useSignOut } from '../hooks/useSession'

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

// Outlet には、このレイアウトの中に入るページが描画される
export function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
