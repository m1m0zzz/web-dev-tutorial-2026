import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Post } from '../types'

type Props = {
  posts: Post[]
  onUpdate: (id: string, values: { title: string; content: string }) => void
  onDelete: (id: string) => void
}

export function PostDetailPage({ posts, onUpdate, onDelete }: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const post = posts.find((p) => p.id === id)

  if (post === undefined) {
    return (
      <main>
        <p>メモが見つかりませんでした。</p>
        <Link to="/">一覧に戻る</Link>
      </main>
    )
  }

  return (
    <PostEditor
      key={post.id}
      post={post}
      onUpdate={onUpdate}
      onDelete={onDelete}
      navigate={navigate}
    />
  )
}

type EditorProps = {
  post: Post
  onUpdate: (id: string, values: { title: string; content: string }) => void
  onDelete: (id: string) => void
  navigate: (to: string) => void
}

function PostEditor({ post, onUpdate, onDelete, navigate }: EditorProps) {
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)

  const handleUpdate = () => {
    onUpdate(post.id, { title, content })
    navigate('/')
  }

  const handleDelete = () => {
    onDelete(post.id)
    navigate('/')
  }

  return (
    <main>
      <Link to="/">一覧に戻る</Link>
      <h1>メモの編集</h1>
      <div className="post-form">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="actions">
          <button onClick={handleUpdate}>更新</button>
          <button onClick={handleDelete}>削除</button>
        </div>
      </div>
    </main>
  )
}
