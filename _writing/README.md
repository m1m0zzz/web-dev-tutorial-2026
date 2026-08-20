# 執筆者向け

このディレクトリには、記事を書く側だけが使うものが入っています。**記事の手順には出てきません。** 学習者はここを読む必要はありません。

| ファイル | 中身 |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | 執筆時の指示（節の書式、参照リンク、調査の原則など） |
| [`sync-chapters.sh`](sync-chapters.sh) | 章ブランチを `main` の履歴に合わせて付け直す |

## 履歴とブランチのモデル

`main` は **「1章 = 1コミット」の直線的な履歴**です。章ブランチはその途中を指しているだけで、独自のコミットは持ちません。

```
41189ab  feat(web): 2章 React でフロントエンドを作る    <- chapter-02
7591c42  feat(api): 3章 Hono でバックエンドを作る        <- chapter-03
ba0398f  test: 4章 テストを書く                          <- chapter-04
3f02f85  ci: 5章 デプロイする                            <- chapter-05
0720344  feat(web): 6章 フロントから API を呼ぶ          <- chapter-06
242f4d5  feat(web): 7章 機能を拡張する                   <- chapter-07
01d1750  test: 8章 E2E テストを行う                      <- chapter-08
5143330  docs: 記事を章ごとのファイルに分割する           <- main
```

**章ブランチを直接編集しないでください。** 編集すると `main` の履歴から外れ、次に付け直したときに消えます。

## どのコミットに入れるか

判断の基準は **「そのファイルが記事に出てくるか」** です。

| ファイル | 入れる場所 | 理由 |
|---|---|---|
| `apps/**` | その章のコミット | 章のコードそのもの |
| `.nvmrc`、`.gitignore` | 2章のコミット | 記事 2.1 で読者が作る |
| `eslint.config.mjs`、`.prettierrc.json`、`.prettierignore` | 2章のコミット | 記事 2.11 で読者が作る |
| `.github/workflows/*.yml` | 5章のコミット | 記事 5.2 で読者が作る |
| `playwright.config.ts`、`tests/e2e/**` | 8章のコミット | 記事 8章で読者が作る |
| `package.json`、`package-lock.json` | 依存を追加した章のコミット | 記事の手順で `npm i` するタイミング |
| `docs/**`、`README.md`、`CLAUDE.md`、`_writing/**`、`renovate.json` | **先端**（ケース1） | 記事に出てこない。章ブランチには含まれない |

**章ブランチには、記事に出てくるファイルしか入っていません。** `CLAUDE.md` や `README.md` を直しても章ブランチは変わりませんし、変える必要もありません。

### 例: Node.js の LTS が上がったとき

`.nvmrc` は記事 2.1 で作るファイルなので、**2章のコミットを直します**（ケース2）。3章以降は積み直されるだけで、個別の作業は要りません。記事側の記述（2.1 の LTS バージョンの説明）は、先端に別コミットで入れます。

### 例: 依存パッケージを更新するとき

Renovate の PR は `main` にだけ入ります。**章ブランチは、記事を書いた時点のバージョンのまま**です。これは意図した状態で、記事に書いてあるバージョンと手元のコードが一致します。

ただし差が開くと、記事の記述（「`create-vite` 9系の生成物は…」など）と実際のコードがずれていきます。**記事がバージョンを明記している箇所と食い違ってきたら、その更新を該当章のコミットに取り込んで（ケース2）、記事も直してください。**

## ケース1: 記事だけを直す

**ブランチ操作は不要です。** 普通にコミットして push してください。

```bash
vim docs/03_backend.md
git add docs/03_backend.md
git commit -m "docs: 3.6 のマイグレーション手順を補足する"
git push origin main
```

## ケース2: ある章のコードを直す

例として、**2章の `PostForm` にラベルを追加する**とします。2章のコミットを直すので、それ以降の章（3〜8）のコミットは自動的に積み直されます。

```bash
# 1. 2章のコミットで止める
git rebase -i --root main
```

エディタが開くので、2章の行を `pick` から `edit` に変えて保存します。

```
edit 41189ab feat(web): 2章 React でフロントエンドを作る
pick 7591c42 feat(api): 3章 Hono でバックエンドを作る
...
```

```bash
# 2. その時点のコードを直す
vim apps/web/src/components/PostForm.tsx
git add apps/web/src/components/PostForm.tsx
git commit --amend --no-edit

# 3. 残りの章を積み直す
git rebase --continue
```

3章以降で同じ箇所を触っていれば、ここで衝突します。**衝突は「後の章がその変更をどう引き継ぐか」の判断そのものなので、内容を見て解決してください。**

```bash
vim <衝突したファイル>
git add <衝突したファイル>
git rebase --continue        # ← ここで --amend は使わない
```

> **衝突の解決中に `git commit --amend` を打たないでください。** rebase が commit を作る前の状態なので、`--amend` は**1つ前の章のコミット**を書き換えます。適用中だったコミットは独立した存在ではなくなり、**その章のコミットが消えます**（中身は前の章のコミットに混ざります）。
>
> 「その章のコミットの内容を変えたい」場合は、todo で `edit` を指定して**適用が完了して停止したあと**に `--amend` してください。
>
> 消してしまったときの復旧:
>
> ```bash
> git rebase --abort                # rebase の途中なら、これで元に戻る
> git reset --hard origin/main      # push 前で rebase を終えてしまったなら、リモートの状態に戻す
> ```
>
> **`git add -A` にも注意してください。** 章のコミットを直しているときの `.gitignore` は「その章の時点」の内容です。あとの章で無視するようになった生成物（`test-results/` など）が手元にあると、巻き込んでコミットしてしまいます。`git status` を見て、意図したファイルだけを `git add` してください。
>
> **`./_writing/sync-chapters.sh` が検出器になります。** 章のコミットが 1 件に定まらないと `main に "8章" のコミットが 0 件見つかりました` と表示して停止するので、**push する前に必ず一度実行してください。**

```bash
# 4. 章ブランチを付け直す（--push を付けなければローカルの付け直しだけ）
./_writing/sync-chapters.sh

# chapter-02: 41189ab -> 9c31a02
# chapter-03: 7591c42 -> 4f80b11
# ...

# 5. 問題なければ push
./_writing/sync-chapters.sh --push
```

```bash
# 6. 各章が壊れていないか CI で確認する
gh workflow run ci.yml
gh run watch
```

`chapters` ジョブが `chapter-02` 〜 `chapter-08` をそれぞれ checkout して、`npm ci` / lint / 型チェック / テスト / ビルドを回します。**上流の章を直した結果、後の章が壊れていないかはここで分かります。**

## ケース3: 記事とコードを同時に直す

**コードは該当章のコミットに、記事は先端に別コミットで**入れてください。記事を章のコミットに混ぜると、章ブランチに古い記事が同梱されることになります。

```bash
git rebase -i --root main        # コードだけを直す（ケース2 の手順1〜3）
./_writing/sync-chapters.sh --push

vim docs/02_frontend.md          # 記事は普通のコミットで
git commit -am "docs: 2.8 のコンポーネント分離を実装に合わせる"
git push origin main
```

## ケース4: 新しい章を足す

1. `main` に「N章」を含むコミットメッセージでコードをコミットする
2. `_writing/sync-chapters.sh` の `CHAPTERS` 配列に番号を足す
3. `.github/workflows/ci.yml` の `chapters` ジョブの matrix に `chapter-0N` を足す
4. `README.md` と `docs/00_introduction.md` の対応表に行を足す

## sync-chapters.sh

```bash
./_writing/sync-chapters.sh          # ローカルの章ブランチを付け直して結果を表示
./_writing/sync-chapters.sh --push   # そのまま force-with-lease で push
```

コミットメッセージの「N章」で各章のコミットを探します。以下の場合は**何もせずに終了**します。

- 作業ツリーに未コミットの変更がある
- 「N章」を含むコミットが `main` に 0 件、または 2 件以上ある

`--push` は `main` と章ブランチ 7 本をまとめて force push します（`--force-with-lease`）。**章ブランチは共同作業用ではなく公開スナップショットなので、force push して構いません。** 読者は clone し直すか、`git fetch --all` で追随できます。

## 確認済みの事項

以下は実機で動かして確認済みです（2026年8月時点）。バージョンが上がったら再確認してください。

| 章 | 確認したこと |
|---|---|
| 全体 | 完成コードはこのリポジトリ。章ごとのブランチ（`chapter-02` 〜）を順次追加 |
| 2 | Node.js の LTS は 24。`create-vite` 9系の生成物（Vite 8 / React 19 / TS 6、Lint は oxlint） |
| [2.10](../docs/02_frontend.md#210-react-router-でページを分ける) | React Router v8。モードの呼称（Framework / Data / Declarative）は変わっていない |
| [2.11](../docs/02_frontend.md#211-任意-eslint--prettier-のセットアップ) | ESLint 10 + typescript-eslint + Prettier 3。`eslint-config-prettier` は不要 |
| [3.2](../docs/03_backend.md#32-npm-create-honolatest) | `create-hono` 0.19 系の生成物。`"private": true` は入っていない |
| [3.5](../docs/03_backend.md#35-環境変数とシークレット) | `wrangler types` が `vars` をリテラル型、`.dev.vars` のキーを `string` として生成する |
| [3.6](../docs/03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) | Drizzle 0.45 / drizzle-kit 0.31。ローカル D1 は `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` |
| [3.7](../docs/03_backend.md#37-入力バリデーション) | `@hono/zod-validator` 0.9 + zod 4 |
| [3.10](../docs/03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) | Better Auth 1.7。D1 の組み込みサポートはあるが、この記事は Drizzle アダプタを使う。`drizzleAdapter` には `schema` を渡す必要がある。トークンは `set-auth-token` ヘッダー |
| 4 | Vitest 4 + Testing Library 16 / `@cloudflare/vitest-pool-workers` 0.22（`cloudflareTest` プラグイン形式） |
| [6.3](../docs/06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) | RPC の型共有は `tsconfig` の `paths` だけで足りる（project references 不要） |
| [6.1](../docs/06_api-integration.md#61-cors) | CORS に加えて Better Auth の `trustedOrigins` が必要 |
| 8 | Playwright 1.62。`webServer` は `globalSetup` より先に起動する |

## 未確認の事項

**Cloudflare のアカウントが必要なため、まだ実機で確認できていません。**

- [3.1](../docs/03_backend.md#31-cloudflare-アカウント作成--wrangler-login): `wrangler login` の実際の画面遷移
- [3.6](../docs/03_backend.md#36-drizzle--d1-で-posts-テーブルを作る): `wrangler d1 create` の出力
- [5.1](../docs/05_deploy.md#51-環境変数シークレットの置き場所を決める): API トークンの発行画面と、必要な権限の最小セット
- [5.2](../docs/05_deploy.md#52-github-actions-を構築する): GitHub Actions が実際に通ること（ワークフローは書いたが、push していない）
- [6.6](../docs/06_api-integration.md#66-環境変数を追加して再デプロイ): 本番環境での通しの動作確認
- [7.5](../docs/07_features.md#75-csr-の限界): デプロイしたフロントに `curl` を投げ、初期 HTML に本文が含まれないことの実測

その他:

- [2.9](../docs/02_frontend.md#29-css-基礎): 図の作成（必要な図の一覧は本文に記載済み）
