# 執筆メモ

**この文書は読者向けではありません。** 記事本文は `docs/` にあります。

## ドキュメントの構成

Claude Code 上での作業時は、この単一ファイルを章ごとに分割する。

```
docs/
├── 00_introduction.md   この記事について / ロードマップ全体像
├── 01_setup.md          1 環境構築
├── 02_frontend.md       2 React でフロントエンドを作る
├── 03_backend.md        3 Hono でバックエンドを作る
├── 04_test.md           4 テストを書く
├── 05_deploy.md         5 デプロイする
├── 06_api-integration.md  6 フロントから API を呼ぶ
├── 07_features.md       7 機能を拡張する
├── 08_e2e.md            8 E2E テストを行う
└── 09_devtools.md       9 任意) 開発環境をさらに整える
```

**この「執筆メモ」は読者向けではないため、`docs/` の外に置く。** `NOTES.md` などリポジトリのルートに配置し、公開時には含めない。

### 分割にあたっての注意

- **章をまたぐ参照が多い。** 「[3.3](docs/03_backend.md#33-最初のエンドポイント-health) で触れた通り」「[6.5](docs/06_api-integration.md#65-認証情報の受け渡し) で再度触れます」といった記述が各所にある。分割時にはファイル間リンクに置き換えること。特に多いのは以下の経路
  - [1.4](docs/01_setup.md#14-safe-chain) サプライチェーン攻撃 → [6.5](docs/06_api-integration.md#65-認証情報の受け渡し) localStorage のリスク
  - [2.13](docs/02_frontend.md#213-任意-csr--ssg--ssr--isr) CSR/SSG/SSR/ISR → [7.5](docs/07_features.md#75-csr-の限界) CSR の限界
  - [3.3](docs/03_backend.md#33-最初のエンドポイント-health) メソッドチェーン → [6.3](docs/06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) Hono RPC
  - [3.7](docs/03_backend.md#37-入力バリデーション) バリデーション → [6.3](docs/06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) Hono RPC
  - [2.1](docs/02_frontend.md#21-リポジトリと-workspace-を作る) `.gitignore` → [3.5](docs/03_backend.md#35-環境変数とシークレット) 環境変数
- **節番号はファイル名の数字と一致させる。** `docs/03_backend.md` の中の節は `3.1` から始まる
- **各ファイルの冒頭に、その章で何を作るかを1〜2行で書く。** 途中の章から読み始める読者がいるため
- **各ファイルの末尾に、対応するブランチ名を記載する**

### 節の追加・削除が起きた場合

節番号を振り直すと、他の章からの参照がすべて壊れる。番号のずれが発生したときは、**全ファイルを横断して参照を確認すること。** 特に「執筆メモ」内のエンドポイント一覧と確認事項も、章番号を含んでいるため更新が必要。

## 確定した方針

| 項目 | 決定 |
|---|---|
| ゴール | 認証付きの公開メモアプリを Cloudflare にデプロイする |
| 想定読者 | プログラミング経験あり、Web/JS は初めて。TS/JS は少し触った程度 |
| OS | WSL2 (Ubuntu) 固定。mac/Linux は [1.1](docs/01_setup.md#11-wsl2-ubuntu) をスキップ |
| シェル | bash |
| パッケージマネージャ | npm |
| リポジトリ | 1リポジトリ / npm workspaces (`apps/web`, `apps/api`)。Private、`.gitignore` は Node テンプレート |
| `"private": true` | ルート・`apps/web`・`apps/api` すべてに設定 |
| `.nvmrc` | メジャーバージョンのみ |
| ルーティング | React Router Declarative mode |
| API 呼び出し | 素の fetch → Hono RPC → React Query |
| バリデーション | zod + Hono のバリデータミドルウェア |
| 認証 | Better Auth（Drizzle アダプタ + bearer）、localStorage 保存 |
| ユーザー ID | サインアップ時に入力、変更不可、予約語を除外。表示名 `name` は別カラムで変更可 |
| オリジン | フロントと API を別 Worker にデプロイ（クロスオリジン） |
| 単体テスト | Vitest（フロント: Testing Library / バック: vitest-pool-workers） |
| E2E | Playwright、ローカル dev サーバーに対して実行 |
| コード提示 | 差分・該当箇所のみ。完成コードは別リポジトリ、章ごとにブランチ |
| Lint / Format | ESLint + Prettier。workspace ルートに集約 |
| SEO | 対策はしない。[7.5](docs/07_features.md#75-csr-の限界) で CSR の限界として提示し、次の一歩の入り口とする |

## データモデル

`posts`

| カラム | 型 | 必須 | 備考 |
|---|---|---|---|
| `id` | text | ○ | 主キー |
| `user_id` | text | ○ | 外部キー |
| `title` | text | ○ | |
| `content` | text | ○ | 本文 |
| `is_public` | integer (boolean) | ○ | 既定値 false |
| `created_at` | integer | ○ | |
| `updated_at` | integer | ○ | |

## エンドポイント一覧

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/health` | 不要 | 死活確認 |
| GET | `/posts` | 必須 | 自分のメモ一覧 |
| POST | `/posts` | 必須 | 作成 |
| GET | `/posts/:id` | 任意 | 所有者 or `is_public` が true |
| PUT | `/posts/:id` | 必須 | 所有者のみ |
| DELETE | `/posts/:id` | 必須 | 所有者のみ |
| GET | `/public/posts` | 不要 | 全体公開の一覧 |
| GET | `/users/:userId/posts` | 不要 | そのユーザーの公開メモ一覧 |

認可ルール:

```
閲覧: 所有者である || is_public が true
編集・削除: 所有者である
```

権限がない場合は **403 ではなく 404** を返す。

## 確認済みの事項

以下は実機で動かして確認済みです（2026年8月時点）。バージョンが上がったら再確認してください。

| 章 | 確認したこと |
|---|---|
| 全体 | 完成コードはこのリポジトリ。章ごとのブランチ（`chapter-02` 〜）を順次追加 |
| 2 | Node.js の LTS は 24。`create-vite` 9系の生成物（Vite 8 / React 19 / TS 6、Lint は oxlint） |
| [2.10](docs/02_frontend.md#210-react-router-でページを分ける) | React Router v8。モードの呼称（Framework / Data / Declarative）は変わっていない |
| [2.11](docs/02_frontend.md#211-任意-eslint--prettier-のセットアップ) | ESLint 10 + typescript-eslint + Prettier 3。`eslint-config-prettier` は不要 |
| [3.2](docs/03_backend.md#32-npm-create-honolatest) | `create-hono` 0.19 系の生成物。`"private": true` は入っていない |
| [3.5](docs/03_backend.md#35-環境変数とシークレット) | `wrangler types` が `vars` をリテラル型、`.dev.vars` のキーを `string` として生成する |
| [3.6](docs/03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) | Drizzle 0.45 / drizzle-kit 0.31。ローカル D1 は `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` |
| [3.7](docs/03_backend.md#37-入力バリデーション) | `@hono/zod-validator` 0.9 + zod 4 |
| [3.10](docs/03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) | Better Auth 1.7。D1 の組み込みサポートはあるが、この記事は Drizzle アダプタを使う。`drizzleAdapter` には `schema` を渡す必要がある。トークンは `set-auth-token` ヘッダー |
| 4 | Vitest 4 + Testing Library 16 / `@cloudflare/vitest-pool-workers` 0.22（`cloudflareTest` プラグイン形式） |
| [6.3](docs/06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) | RPC の型共有は `tsconfig` の `paths` だけで足りる（project references 不要） |
| [6.1](docs/06_api-integration.md#61-cors) | CORS に加えて Better Auth の `trustedOrigins` が必要 |
| 8 | Playwright 1.62。`webServer` は `globalSetup` より先に起動する |

## 未確認の事項

**Cloudflare のアカウントが必要なため、まだ実機で確認できていません。**

- [3.1](docs/03_backend.md#31-cloudflare-アカウント作成--wrangler-login): `wrangler login` の実際の画面遷移
- [3.6](docs/03_backend.md#36-drizzle--d1-で-posts-テーブルを作る): `wrangler d1 create` の出力
- [5.1](docs/05_deploy.md#51-環境変数シークレットの置き場所を決める): API トークンの発行画面と、必要な権限の最小セット
- [5.2](docs/05_deploy.md#52-github-actions-を構築する): GitHub Actions が実際に通ること（ワークフローは書いたが、push していない）
- [6.6](docs/06_api-integration.md#66-環境変数を追加して再デプロイ): 本番環境での通しの動作確認
- [7.5](docs/07_features.md#75-csr-の限界): デプロイしたフロントに `curl` を投げ、初期 HTML に本文が含まれないことの実測

その他:

- [2.9](docs/02_frontend.md#29-css-基礎): 図の作成（必要な図の一覧は本文に記載済み）
- 記事の `docs/` 分割（下記「ドキュメントの構成」を参照）

## 調査時の原則

技術的な事柄を調べるときは、**第1に公式ドキュメントを当たること。** 公式ドキュメントが不十分な場合は実装を調べること。ブログ等の二次情報を公式の記述として扱わないこと。
