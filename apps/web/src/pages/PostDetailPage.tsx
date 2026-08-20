import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useDeletePost, usePost, useUpdatePost } from '../hooks/usePosts'
import type { Post } from '../types'

export function PostDetailPage() {
  const { id } = useParams()
  const { data: post, isPending, isError } = usePost(id!)

  if (isPending) return <main>読み込み中…</main>
  if (isError || post === undefined) {
    return (
      <main>
        <p>メモが見つかりませんでした。</p>
        <Link to="/">一覧に戻る</Link>
      </main>
    )
  }

  return <PostEditor key={post.id} post={post} />
}

function PostEditor({ post }: { post: Post }) {
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()
  const navigate = useNavigate()

  const handleUpdate = async () => {
    await updatePost.mutateAsync({ id: post.id, title, content })
    navigate('/')
  }

  const handleDelete = async () => {
    await deletePost.mutateAsync(post.id)
    navigate('/')
  }

  return (
    <main>
      <Link to="/">一覧に戻る</Link>
      <h1>メモの編集</h1>
      <div className="post-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="本文"
        />
        <div className="actions">
          <button onClick={handleUpdate}>更新</button>
          <button onClick={handleDelete}>削除</button>
        </div>
      </div>
    </main>
  )
}
