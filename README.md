# Web アプリ開発 チュートリアル 2026

プログラミング経験はあるが Web / JavaScript のエコシステムは初めて、という人に向けた、ハンズオン形式の学習記事です。

**ゴール: 認証付きの公開メモアプリを Cloudflare にデプロイする**

## 記事

[docs/00_introduction.md](docs/00_introduction.md) から読み始めてください。

| 章 | ブランチ |
|---|---|
| [1 環境構築](docs/01_setup.md) | — |
| [2 React でフロントエンドを作る](docs/02_frontend.md) | [chapter-02](https://github.com/m1m0zzz/web-dev-tutorial-2026/tree/chapter-02) |
| [3 Hono でバックエンドを作る](docs/03_backend.md) | [chapter-03](https://github.com/m1m0zzz/web-dev-tutorial-2026/tree/chapter-03) |
| [4 テストを書く](docs/04_test.md) | [chapter-04](https://github.com/m1m0zzz/web-dev-tutorial-2026/tree/chapter-04) |
| [5 デプロイする](docs/05_deploy.md) | [chapter-05](https://github.com/m1m0zzz/web-dev-tutorial-2026/tree/chapter-05) |
| [6 フロントから API を呼ぶ](docs/06_api-integration.md) | [chapter-06](https://github.com/m1m0zzz/web-dev-tutorial-2026/tree/chapter-06) |
| [7 機能を拡張する](docs/07_features.md) | [chapter-07](https://github.com/m1m0zzz/web-dev-tutorial-2026/tree/chapter-07) |
| [8 E2E テストを行う](docs/08_e2e.md) | [chapter-08](https://github.com/m1m0zzz/web-dev-tutorial-2026/tree/chapter-08) |
| [9 任意) 開発環境をさらに整える](docs/09_devtools.md) | — |

## コード

`main` は全章を終えた状態です。各章のブランチは、その章を終えた時点のスナップショットです。

```bash
git checkout chapter-03   # 3章を終えた時点の状態
npm install
```

| ディレクトリ | 中身 |
|---|---|
| `apps/web` | フロントエンド（Vite + React + React Router + React Query） |
| `apps/api` | バックエンド（Hono + Cloudflare Workers + D1 + Drizzle + Better Auth） |
| `tests/e2e` | E2E テスト（Playwright） |

```bash
npm run dev -w apps/web    # フロント開発サーバー :5173
npm run dev -w apps/api    # API 開発サーバー :8787
npm test --workspaces      # 単体テスト
npm run test:e2e           # E2E テスト
```

## 執筆者向け

記事を書く側のための手順とツールは [`_writing/`](_writing/README.md) にあります。学習者が読む必要はありません。
