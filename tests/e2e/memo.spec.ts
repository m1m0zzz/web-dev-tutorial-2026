import { expect, test, type Page } from '@playwright/test'

// 実行のたびに別のユーザーを使う（サインアップの重複を避ける）
const unique = () => Math.random().toString(36).slice(2, 8)

const signUp = async (page: Page, userId: string) => {
  await page.goto('/signup')
  await page.getByLabel('メールアドレス').fill(`${userId}@example.com`)
  await page.getByLabel('パスワード').fill('password1234')
  await page.getByLabel('表示名').fill(`${userId} の表示名`)
  await page.getByLabel('ユーザー ID', { exact: false }).fill(userId)
  await page.getByRole('button', { name: '登録する' }).click()
  await expect(page.getByRole('heading', { name: 'メモ' })).toBeVisible()
}

const createPost = async (page: Page, title: string, content: string) => {
  await page.getByPlaceholder('タイトル').fill(title)
  await page.getByPlaceholder('本文').fill(content)
  await page.getByRole('button', { name: '追加' }).click()
  await expect(page.getByRole('link', { name: title })).toBeVisible()
}

test('サインアップしてメモを作成すると、一覧に表示される', async ({ page }) => {
  await signUp(page, `u${unique()}`)
  await createPost(page, '買い物', 'たまごを買う')
})

test('メモを編集して更新し、削除できる', async ({ page }) => {
  await signUp(page, `u${unique()}`)
  await createPost(page, '日記', '今日は晴れ')

  await page.getByRole('link', { name: '日記' }).click()
  // 遷移の完了を待たずに入力すると、一覧ページの入力欄に書き込んでしまう
  await expect(page.getByRole('heading', { name: 'メモの編集' })).toBeVisible()

  await page.getByPlaceholder('タイトル').fill('日記（更新後）')
  await page.getByRole('button', { name: '更新' }).click()

  await expect(page.getByRole('link', { name: '日記（更新後）' })).toBeVisible()

  await page.getByRole('button', { name: '削除' }).click()
  await expect(page.getByText('まだメモがありません。')).toBeVisible()
})

test('未ログインで自分のメモ一覧を開くと、ログイン画面に飛ばされる', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
})

test('公開したメモは、ログアウトしても URL から読める', async ({ page }) => {
  await signUp(page, `u${unique()}`)
  await createPost(page, '公開する日記', 'みんなに見せる')

  await page.getByRole('link', { name: '公開する日記' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '公開する' }).click()
  await expect(page.getByText('状態: 公開中')).toBeVisible()

  const url = page.url()
  await page.getByRole('button', { name: 'ログアウト' }).click()

  await page.goto(url)
  await expect(
    page.getByRole('heading', { name: '公開する日記' }),
  ).toBeVisible()
  await expect(page.getByText('みんなに見せる')).toBeVisible()
})

test('非公開メモの URL は、未ログインでは開けない', async ({ page }) => {
  await signUp(page, `u${unique()}`)
  await createPost(page, '秘密のメモ', 'ひみつ')

  await page.getByRole('link', { name: '秘密のメモ' }).click()
  const url = page.url()

  await page.getByRole('button', { name: 'ログアウト' }).click()
  await page.goto(url)

  await expect(page.getByText('メモが見つかりませんでした。')).toBeVisible()
})

test('公開一覧には、公開メモだけが並ぶ', async ({ page }) => {
  const userId = `u${unique()}`
  await signUp(page, userId)
  await createPost(page, `公開-${userId}`, '見せる')
  await createPost(page, `非公開-${userId}`, '見せない')

  await page.getByRole('link', { name: `公開-${userId}`, exact: true }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '公開する' }).click()
  await expect(page.getByText('状態: 公開中')).toBeVisible()

  await page.getByRole('button', { name: 'ログアウト' }).click()
  await page.goto('/public')

  await expect(
    page.getByRole('link', { name: `公開-${userId}`, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: `非公開-${userId}`, exact: true }),
  ).toHaveCount(0)
})

test('ログアウトを押すと、その場でログイン画面に戻る', async ({ page }) => {
  await signUp(page, `u${unique()}`)

  await page.getByRole('button', { name: 'ログアウト' }).click()

  // 画面遷移を挟まずに、その場で認証状態が切り替わることを確認する
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
})
