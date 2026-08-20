# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このリポジトリの構成

**執筆リポジトリと、その記事が作るアプリのコードが同居しています。**

- `docs/00_introduction.md` 〜 `docs/09_devtools.md` — 日本語のハンズオン記事「Web アプリ開発 学習ロードマップ」本体（章ごとに1ファイル）
- `NOTES.md` — 執筆メモ。**読者向けではありません**（確定した方針・データモデル・エンドポイント一覧・未確認事項）
- `apps/web` — 記事の2章で作るフロントエンド（Vite + React + React Router）
- `apps/api` — 記事の3章で作るバックエンド（Hono + Cloudflare Workers + D1 + Drizzle + Better Auth）

ルートは npm workspaces のルートで、Lint / 整形の設定もここに集約されています。**記事に書いたコマンドは、このリポジトリでそのまま実行して検証できます。** 記事の記述と実物がずれたら、実物を動かして確かめたほうを正とします。

章ごとのブランチ（`chapter-02`、`chapter-03` …）は、各章を終えた時点のコードのスナップショットです。**章の作業が一区切りしたらコミットし、対応するブランチを切ります。** `main` が最新です。

### 前の章を直したとき

`main` は「1章 = 1コミット」の直線的な履歴で、章ブランチはその途中を指しているだけです。**章ブランチを個別に編集せず、`main` の履歴を直してから付け直します。**

```bash
# 1. 該当する章のコミットを直す（例: 2章）
git rebase -i --root main          # 直したいコミットを edit → 修正 → git rebase --continue

# 2. 章ブランチを、対応するコミットに付け直す
git log --oneline main             # 各章のコミットハッシュを確認
git branch -f chapter-02 <sha>     # 直した章と、それ以降の章すべて
git branch -f chapter-03 <sha>
# ... chapter-08 まで

# 3. まとめて force push
git push --force-with-lease origin main chapter-02 chapter-03 chapter-04 \
  chapter-05 chapter-06 chapter-07 chapter-08
```

**スクリプトは置きません。** このリポジトリは学習者が読むものなので、記事に出てこない自動化を混ぜないという方針です。

付け直したあとは、GitHub Actions の CI を `workflow_dispatch` で手動実行してください。`chapters` ジョブが各章ブランチを checkout して `npm ci` / lint / 型チェック / テスト / ビルドを回すので、**上流の章を直した結果、後の章が壊れていないかを確認できます。**

## コマンド

すべてリポジトリのルートで実行します（`-w` でワークスペースを指定）。

```bash
npm install                      # 依存インストール（必ずルートで）
npm run dev -w apps/web          # フロント開発サーバー :5173
npm run dev -w apps/api          # API 開発サーバー :8787（wrangler dev）
npm test -w apps/web             # フロントのテスト（Vitest + Testing Library）
npm test -w apps/api             # API のテスト（vitest-pool-workers、D1 込み）
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

## 執筆のルール

- **節の書式**: 「何のために」「手順」「完了条件」「躓きポイント」。環境構築系は手順を書かず公式ドキュメントの URL を貼り、この3点で補う（インストール手順は変わりやすく、記事にコピーすると古い情報を読者に参照させるため）
- **コード提示**: 初出の概念は全文、そこからの変更は差分・該当箇所のみ
- **`TODO(執筆時)` マーカー**: 実機確認が必要な箇所の目印。埋めるときは必ず実際に動かし、出力を確認してからマーカーごと消す。推測で埋めない
- **節番号は章ファイルの数字と一致させる**。章をまたぐ参照が多いので、節の追加・削除で番号がずれたら全体を横断して直す
- **調査の原則**: 第1に公式ドキュメント。不十分なら実装を読む。ブログ等の二次情報を公式の記述として扱わない

`NOTES.md` に、確定した方針・データモデル・エンドポイント一覧・未確認事項がまとまっています。作業前にそこを読んでください。

**章をまたぐ参照はファイル間リンクになっています。** 節を追加・削除して番号がずれたときは、`docs/` 全体と `NOTES.md` を横断してリンクを直してください（アンカーは GitHub の生成規則に従います）。
