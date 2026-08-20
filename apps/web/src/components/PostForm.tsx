import { useState } from 'react'

type Props = {
  onAdd: (values: { title: string; content: string }) => void
}

export function PostForm({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleAdd = () => {
    if (title === '' || content === '') return

    onAdd({ title, content })
    setTitle('')
    setContent('')
  }

  return (
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
      <button onClick={handleAdd}>追加</button>
    </div>
  )
}
