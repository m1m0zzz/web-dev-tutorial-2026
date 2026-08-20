# Web アプリ開発 学習ロードマップ

プログラミング経験はあるが Web / JavaScript のエコシステムは初めて、という人に向けた、ハンズオン形式の学習記事です。

**ゴール: 認証付きの公開メモアプリを Cloudflare にデプロイする**

## 記事

[docs/00_introduction.md](docs/00_introduction.md) から読み始めてください。

| 章 | 内容 | ブランチ |
|---|---|---|
| [1](docs/01_setup.md) | 環境構築 | — |
| [2](docs/02_frontend.md) | React でフロントエンドを作る | `chapter-02` |
| [3](docs/03_backend.md) | Hono でバックエンドを作る | `chapter-03` |
| [4](docs/04_test.md) | テストを書く | `chapter-04` |
| [5](docs/05_deploy.md) | デプロイする | `chapter-05` |
| [6](docs/06_api-integration.md) | フロントから API を呼ぶ | `chapter-06` |
| [7](docs/07_features.md) | 機能を拡張する | `chapter-07` |
| [8](docs/08_e2e.md) | E2E テストを行う | `chapter-08` |
| [9](docs/09_devtools.md) | 任意) 開発環境をさらに整える | — |

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

`scripts/sync-chapters.sh` は、`main` の履歴から章ブランチを付け直すためのものです。記事の手順には出てきません。詳細は [CLAUDE.md](CLAUDE.md) を参照してください。
