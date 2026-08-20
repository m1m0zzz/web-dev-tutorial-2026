import { Link } from 'react-router'
import { usePublicPosts } from '../hooks/usePosts'

export function PublicPostsPage() {
  const { data: posts, isPending, isError } = usePublicPosts()

  return (
    <main>
      <h1>公開メモ</h1>

      {isPending && <p>読み込み中…</p>}
      {isError && <p role="alert">公開メモの取得に失敗しました</p>}

      <ul className="post-list">
        {posts?.map((post) => (
          <li key={post.id} className="post-item">
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
            <Link to={`/users/${post.author.userId}`}>{post.author.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
