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
      <button onClick={() => onDelete(post.id)}>削除</button>
    </li>
  )
}
