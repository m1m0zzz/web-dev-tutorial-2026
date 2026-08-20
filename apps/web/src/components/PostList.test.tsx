import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Post } from '../types'
import { PostList } from './PostList'

const post = (title: string): Post => ({
  id: `id-${title}`,
  userId: 'user-1',
  title,
  content: '本文',
  isPublic: false,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
})

const renderList = (posts: Post[], onDelete = vi.fn()) => {
  render(
    <MemoryRouter>
      <PostList posts={posts} onDelete={onDelete} />
    </MemoryRouter>,
  )
  return onDelete
}

describe('PostList', () => {
  it('メモが無いときはその旨を表示する', () => {
    renderList([])
    expect(screen.getByText('まだメモがありません。')).toBeInTheDocument()
  })

  it('渡されたメモが一覧に並ぶ', () => {
    renderList([post('買い物'), post('日記')])

    expect(screen.getByRole('link', { name: '買い物' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '日記' })).toBeInTheDocument()
  })

  it('削除ボタンを押すと、その id が渡る', async () => {
    const user = userEvent.setup()
    const onDelete = renderList([post('買い物')])

    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(onDelete).toHaveBeenCalledWith('id-買い物')
  })
})
