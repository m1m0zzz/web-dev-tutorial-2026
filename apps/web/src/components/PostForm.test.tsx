import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PostForm } from './PostForm'

describe('PostForm', () => {
  it('タイトルと本文を入れて追加すると、その内容が渡る', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<PostForm onAdd={onAdd} />)

    await user.type(screen.getByPlaceholderText('タイトル'), '買い物')
    await user.type(screen.getByPlaceholderText('本文'), 'たまごを買う')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(onAdd).toHaveBeenCalledWith({
      title: '買い物',
      content: 'たまごを買う',
    })
  })

  it('タイトルか本文が空のときは追加できない', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<PostForm onAdd={onAdd} />)

    await user.type(screen.getByPlaceholderText('タイトル'), 'タイトルだけ')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(onAdd).not.toHaveBeenCalled()
  })
})
