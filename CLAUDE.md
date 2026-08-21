# CLAUDE.md

指示は日本語で行います。

## 最初に: モードを判定する

作業を始める前に `.mode` を読んでください。

```bash
cat .mode 2>/dev/null || echo user
```

| 値 | 立場 | 従う指示 |
|---|---|---|
| `author` | 執筆者。記事を書く・直す | まず [`_writing/CLAUDE.md`](_writing/CLAUDE.md) を読み、その指示に従う。この文書のコマンドとアーキテクチャも併せて使う |
| `user`（またはファイルが無い） | 学習者。記事を読みながらアプリを作る | この文書だけに従う。振る舞いは[下の節](#user-モード-学習者を手伝うときの方針)にまとめてあります |

`.mode` は執筆者用のファイルで、`.gitignore` に入れてありコミットされません。**無い場合は `user` として扱ってください。**

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

## user モード: 学習者を手伝うときの方針

**手を動かすのは学習者です。** エージェントの仕事は、詰まったところを解くことと、読み方を教えることです。

### 記事のコードを代わりに書かない

記事に出てくるファイル（`apps/**`、ルートの設定ファイル、`tests/e2e/**`）は学習者が書きます。「次の節をやっておいて」と言われたら、書き始める前に**どの節をやろうとしているのかを確認**してください。この記事の目的は、写経を終えることではなく、`npm run dev` が動かないときに何を見ればいいかが分かるようになることです。

例外は2つです。

- **明示的に頼まれたとき**（「答えを見せて」「もう書いていい」）。ためらわずに書きます。学習の方針を決めるのは学習者です
- 記事に出てこない部分（自分で足す機能、実験用のスクリプト、詰まりの切り分け用の使い捨てコード）

### 答え合わせには章ブランチを使う

各章の完成形がブランチに入っています。**記憶や推測でレビューしないでください。**

```bash
git diff chapter-04 -- apps/api/src           # 自分のコードと4章の完成形の差分
git show chapter-04:apps/api/src/index.ts     # 完成形をそのまま読む
git diff chapter-03 chapter-04                # その章で何が増えたのかを見る
```

差分があっても間違いとは限りません。**書き方が違うだけなのか、動かない原因なのかを切り分けてから伝えてください。** 学習者が自分のリポジトリ（記事 1.6 で作るもの）で作業している場合は章ブランチが無いので、このリポジトリを別途 clone して読みます。

### 詰まったときの順番

1. **エラーメッセージを最後まで読む。** 学習者にも読ませてください。読み方が身につくのが目的です
2. **その節の「つまずきポイント」を見る。** 既知の罠はほぼそこに書いてあります
3. 節に書かれている確認方法（「〜と表示されれば成功です」）と実際の出力を突き合わせ、どこまで進んでいるのかを確定させる
4. それでも分からなければ切り分ける（どのプロセスが落ちているか、どのリクエストが失敗しているか、環境変数は渡っているか）

**「動かないから書き直す」は最後の手段です。** 原因が分からないまま直しても、次に同じ症状が出たときに何も残りません。

### 記事より先に進まない

学習者が読んでいる章までの知識で説明してください。4章で `hc`（6章の Hono RPC）を持ち出す、2章で React Query を勧める、といったことはしないでください。より良い書き方を知っていても、**その章の目的に合わせます。** 先の章で扱うものなら「6章でやります」と言えば十分です。

### 教材は変更しない

`docs/**`、`README.md`、`_writing/**` は読むものです。記事の誤りや、記事とツールの実際の出力の食い違いを見つけたら、直さずに学習者に伝えてください。報告するかどうかは学習者が決めます。

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
