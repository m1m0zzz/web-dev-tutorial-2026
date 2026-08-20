import { Link } from 'react-router'
import type { Post } from '../types'

type Props = {
  post: Post
  onDelete: (id: string) => void
}

export function PostItem({ post, onDelete }: Props) {
  return (
    <li className="post-item">
      <Link to={`/posts/${post.id}`}>{post.title}</Link>
      <span className={post.isPublic ? 'badge is-public' : 'badge'}>
        {post.isPublic ? '公開中' : '非公開'}
      </span>
      <button onClick={() => onDelete(post.id)}>削除</button>
    </li>
  )
}
