import { PostForm } from '../components/PostForm'
import { PostList } from '../components/PostList'
import type { Post } from '../types'

type Props = {
  posts: Post[]
  onAdd: (values: { title: string; content: string }) => void
  onDelete: (id: string) => void
}

export function PostListPage({ posts, onAdd, onDelete }: Props) {
  return (
    <main>
      <h1>メモ</h1>
      <PostForm onAdd={onAdd} />
      <PostList posts={posts} onDelete={onDelete} />
    </main>
  )
}
