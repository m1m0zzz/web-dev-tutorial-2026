import { PostForm } from '../components/PostForm'
import { PostList } from '../components/PostList'
import { useCreatePost, useDeletePost, usePosts } from '../hooks/usePosts'

export function PostListPage() {
  const { data: posts, isPending, isError } = usePosts()
  const createPost = useCreatePost()
  const deletePost = useDeletePost()

  return (
    <main>
      <h1>メモ</h1>
      <PostForm onAdd={(values) => createPost.mutate(values)} />

      {isPending && <p>読み込み中…</p>}
      {isError && <p role="alert">メモの取得に失敗しました</p>}
      {posts !== undefined && (
        <PostList posts={posts} onDelete={(id) => deletePost.mutate(id)} />
      )}
    </main>
  )
}
