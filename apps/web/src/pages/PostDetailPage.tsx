import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useDeletePost, usePost, useUpdatePost } from '../hooks/usePosts'
import { useSession } from '../hooks/useSession'
import type { Post } from '../types'

export function PostDetailPage() {
  const { id } = useParams()
  const { data: post, isPending, isError } = usePost(id!)
  // セッションの確認が終わる前に所有者を判定すると、
  // 所有者にも一瞬だけ閲覧専用の画面が見えてしまう
  const { data: user, isPending: isSessionPending } = useSession()

  if (isPending || isSessionPending) return <main>読み込み中…</main>
  if (isError || post === undefined) {
    return (
      <main>
        <p>メモが見つかりませんでした。</p>
        <Link to="/public">公開メモ一覧へ</Link>
      </main>
    )
  }

  // 所有者だけが編集できる。それ以外（未ログイン含む）は読むだけ
  if (user === null || user === undefined || user.id !== post.userId) {
    return (
      <main>
        <h1>{post.title}</h1>
        <p className="post-content">{post.content}</p>
      </main>
    )
  }

  return <PostEditor key={post.id} post={post} />
}

function PostEditor({ post }: { post: Post }) {
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const [copied, setCopied] = useState(false)
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

  // 公開の切り替えは、意図しないと起きない操作にする（確認を挟む）
  const handleTogglePublic = async () => {
    const nextIsPublic = !post.isPublic
    if (
      nextIsPublic &&
      !window.confirm(
        'このメモを公開します。公開メモの一覧に載り、ログインしていない人でも読めるようになります。',
      )
    ) {
      return
    }

    await updatePost.mutateAsync({
      id: post.id,
      title,
      content,
      isPublic: nextIsPublic,
    })
  }

  // 共有用の URL。公開中のときだけ意味を持つ
  const shareUrl = `${window.location.origin}/posts/${post.id}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
  }

  return (
    <main>
      <Link to="/">一覧に戻る</Link>
      <h1>メモの編集</h1>

      <p>
        状態: {post.isPublic ? '公開中' : '非公開'}{' '}
        <button onClick={handleTogglePublic}>
          {post.isPublic ? '非公開にする' : '公開する'}
        </button>
      </p>

      {post.isPublic && (
        <p className="share">
          <input readOnly value={shareUrl} aria-label="共有 URL" />
          <button onClick={handleCopy}>URL をコピー</button>
          {copied && <span>コピーしました</span>}
        </p>
      )}

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
