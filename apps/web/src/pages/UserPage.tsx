import { Link, useParams } from 'react-router'
import { useUserPosts } from '../hooks/usePosts'

export function UserPage() {
  const { userId } = useParams()
  const { data, isPending, isError } = useUserPosts(userId!)

  if (isPending) return <main>読み込み中…</main>
  if (isError || data === undefined) {
    return (
      <main>
        <p>ユーザーが見つかりませんでした。</p>
        <Link to="/public">公開メモ一覧へ</Link>
      </main>
    )
  }

  return (
    <main>
      {/* URL には変更されない ID を、画面には表示名を出す */}
      <h1>{data.author.name} の公開メモ</h1>
      <p>@{data.author.userId}</p>

      <ul className="post-list">
        {data.posts.map((post) => (
          <li key={post.id} className="post-item">
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
