import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'

const renderApp = () =>
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

const addPost = async (title: string, content: string) => {
  const user = userEvent.setup()
  if (title !== '') {
    await user.type(screen.getByPlaceholderText('タイトル'), title)
  }
  if (content !== '') {
    await user.type(screen.getByPlaceholderText('本文'), content)
  }
  await user.click(screen.getByRole('button', { name: '追加' }))
}

describe('メモ一覧', () => {
  it('最初は空のメッセージが出る', () => {
    renderApp()
    expect(screen.getByText('まだメモがありません。')).toBeInTheDocument()
  })

  it('追加すると一覧に増える', async () => {
    renderApp()
    await addPost('買い物', 'たまごを買う')

    expect(screen.getByRole('link', { name: '買い物' })).toBeInTheDocument()
  })

  it('削除すると一覧から消える', async () => {
    const user = userEvent.setup()
    renderApp()
    await addPost('買い物', 'たまごを買う')

    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(
      screen.queryByRole('link', { name: '買い物' }),
    ).not.toBeInTheDocument()
  })

  it.each([
    ['タイトルだけ', ''],
    ['', '本文だけ'],
  ])(
    'タイトルか本文が空のときは追加できない (%s / %s)',
    async (title, content) => {
      renderApp()
      await addPost(title, content)

      expect(screen.getByText('まだメモがありません。')).toBeInTheDocument()
    },
  )
})
