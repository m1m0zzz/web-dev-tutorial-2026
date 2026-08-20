# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**記事を執筆・保守する場合は、まず [`_writing/CLAUDE.md`](_writing/CLAUDE.md) を読んでください。** この文書は、記事を読みながらアプリを作る側（学習者）向けです。

## このリポジトリの構成

- `docs/00_introduction.md` 〜 `docs/09_devtools.md` — 記事本体。[README.md](README.md) が入口です
- `apps/web` — フロントエンド（Vite + React + React Router + React Query）
- `apps/api` — バックエンド（Hono + Cloudflare Workers + D1 + Drizzle + Better Auth）
- `tests/e2e` — E2E テスト（Playwright）

ルートは npm workspaces のルートで、Lint / 整形の設定もここに集約されています。`main` は全章を終えた状態、`chapter-02` 〜 `chapter-08` は各章を終えた時点のスナップショットです。

```bash
git checkout chapter-03   # 3章を終えた時点の状態から始める
npm install
```

## コマンド

すべてリポジトリのルートで実行します（`-w` でワークスペースを指定）。

```bash
npm install                      # 依存インストール（必ずルートで）
npm run dev -w apps/web          # フロント開発サーバー :5173
npm run dev -w apps/api          # API 開発サーバー :8787（wrangler dev）
npm test -w apps/web             # フロントのテスト（Vitest + Testing Library）
npm test -w apps/api             # API のテスト（vitest-pool-workers、D1 込み）
npm run test:e2e                 # E2E テスト（Playwright。2つのサーバーを自動起動）
npm run build -w apps/web        # tsc -b && vite build
npm run typecheck -w apps/api    # tsc --noEmit
npm run lint                     # eslint .（ルート集約）
npm run format                   # prettier . --write（記事本文 *.md は対象外）
```

単体のテストファイルを走らせるときは `npx vitest run --root apps/api test/posts.test.ts` のように `--root` を渡します。

データベース（`apps/api`）:

```bash
npm run cf-typegen -w apps/api        # wrangler.jsonc / .dev.vars から型を再生成
npm run db:generate -w apps/api       # drizzle-kit generate（--name を付ける）
npm run db:migrate:local -w apps/api  # ローカル D1 に適用
npm run db:studio -w apps/api         # Drizzle Studio（ローカル D1）
```

**`wrangler.jsonc` を変更したら `cf-typegen` を実行し直してください。** `c.env.DB` が型エラーになる原因のほとんどがこれです。

## アーキテクチャ上の要点

- **API のルーティングはメソッドチェーンで書く。** `const app = new Hono().get(...).post(...)` の形を崩すと、6章で使う Hono RPC の型（`AppType`）が導出されません
- **認可は `where` 句に混ぜる。** 「所有者か」を SQL の条件に入れることで、他人のメモへの更新・削除が自然と 0 件 → 404 になります。403 は返しません（存在の有無を漏らさないため）
- **Better Auth のインスタンスはリクエストごとに生成する。** D1 バインディングが `c.env` 経由でしか取れないためです。`apps/api/src/auth.ts` の `createAuth(env)` がそれで、同ファイルの `auth` export は Better Auth CLI がスキーマ生成に読むためだけのものです
- `apps/api/src/db/auth-schema.ts` は `npx auth@latest generate` の生成物です。手で編集せず、`auth.ts` の `additionalFields` を変えて生成し直します
- ローカル D1 の実体は `apps/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` です
- フロントは別オリジンで動くため、API 側に CORS ミドルウェアと Better Auth の `trustedOrigins` の両方が必要です
