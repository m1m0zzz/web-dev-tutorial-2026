import { useState } from 'react'
import { Route, Routes } from 'react-router'
import { PostDetailPage } from './pages/PostDetailPage'
import { PostListPage } from './pages/PostListPage'
import type { Post } from './types'

function App() {
  const [posts, setPosts] = useState<Post[]>([])

  const addPost = (values: { title: string; content: string }) => {
    const now = Date.now()
    const newPost: Post = {
      id: crypto.randomUUID(),
      title: values.title,
      content: values.content,
      createdAt: now,
      updatedAt: now,
    }
    setPosts([...posts, newPost])
  }

  const updatePost = (
    id: string,
    values: { title: string; content: string },
  ) => {
    setPosts(
      posts.map((post) =>
        post.id === id ? { ...post, ...values, updatedAt: Date.now() } : post,
      ),
    )
  }

  const deletePost = (id: string) => {
    setPosts(posts.filter((post) => post.id !== id))
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PostListPage posts={posts} onAdd={addPost} onDelete={deletePost} />
        }
      />
      <Route
        path="/posts/:id"
        element={
          <PostDetailPage
            posts={posts}
            onUpdate={updatePost}
            onDelete={deletePost}
          />
        }
      />
    </Routes>
  )
}

export default App
