import type { Post } from '../types'
import { PostItem } from './PostItem'

type Props = {
  posts: Post[]
  onDelete: (id: string) => void
}

export function PostList({ posts, onDelete }: Props) {
  if (posts.length === 0) {
    return <p>まだメモがありません。</p>
  }

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} onDelete={onDelete} />
      ))}
    </ul>
  )
}
