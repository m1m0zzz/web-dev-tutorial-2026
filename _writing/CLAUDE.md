# CLAUDE.md（執筆者向け）

記事を書く・直すときの指示です。**アプリのコードを触るときは、ルートの [`../CLAUDE.md`](../CLAUDE.md)（学習者向け）も読んでください。** コマンドとアーキテクチャ上の要点はそちらにあります。

この文書は、リポジトリのルートの `.mode` に `author` と書かれているときに読むものです。無い場合は学習者（`user`）として扱われるので、執筆作業を始める前に作ってください。

```bash
echo author > .mode
```

`.mode` は `.gitignore` に入っていてコミットされません。**学習者の手元には存在しない前提**で、記事の手順は `.mode` に依存させないでください。

## 文書の構成

| 場所 | 中身 |
|---|---|
| `docs/00_introduction.md` 〜 `09_devtools.md` | 記事本体。章ごとに1ファイル、ファイル名の数字と節番号が一致する |
| `README.md`（ルート） | リポジトリの入口。章一覧とブランチ対応表 |
| [`_writing/README.md`](README.md) | 章ブランチの運用手順と、確認済み / 未確認の事項 |
| `_writing/` | 執筆者向けのもの。記事の手順には出てきません |

**何がまだ実機で確認できていないかは、[`README.md`](README.md) の「未確認の事項」を見てください。**

## 執筆のルール

- **節の書式は固定しない**。「何のために」「手順」「完了条件」といったラベルは書かない。毎節に同じ見出しが並ぶと冗長になるため、目的も確認方法も地の文で書く
- **確認方法は読者が自分で成否を判定できる形にする**。「`code .` を実行すると VS Code が開き、左下に「WSL: Ubuntu」と表示されれば成功です」のように、見えるものを書く
- **つまずきポイント**はラベルを残し、中身を GitHub のアラートにする。この形以外は使わない

  ```markdown
  **つまずきポイント**

  > [!TIP]
  > - **作業ディレクトリは必ず Linux 側（`~/` 配下）に置いてください。** …
  > - …
  ```

- 環境構築系はインストール手順を書かず、公式ドキュメントの URL を貼る（手順は変わりやすく、記事にコピーすると古い情報を読者に参照させるため）
- **コード提示**: 初出の概念は全文、そこからの変更は差分・該当箇所のみ
- **`TODO(執筆時)` マーカー**: 実機確認が必要な箇所の目印。埋めるときは必ず実際に動かし、出力を確認してからマーカーごと消す。**推測で埋めない**
- **節番号はファイル名の数字と一致させる**（`docs/03_backend.md` の節は `3.1` から）
- **各章ファイルの冒頭に、その章で何を作るかを1〜2行で書く**（途中の章から読み始める読者がいるため）。末尾には対応するブランチ名を書く
- **調査の原則**: 第1に公式ドキュメント。不十分なら実装を読む。ブログ等の二次情報を公式の記述として扱わない

## このアプリの仕様

記事全体で前提にしている決定です。**変えるときは、影響する章をすべて洗い出してから変えてください。**

### 確定した方針

| 項目 | 決定 |
|---|---|
| ゴール | 認証付きの公開メモアプリを Cloudflare にデプロイする |
| 想定読者 | プログラミング経験あり、Web/JS は初めて。TS/JS は少し触った程度 |
| OS | WSL2 (Ubuntu) 固定。mac/Linux は [1.1](../docs/01_setup.md#11-wsl2-ubuntu) をスキップ |
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
| コード提示 | 差分・該当箇所のみ。完成コードはこのリポジトリ。章ごとにブランチ |
| Lint / Format | ESLint + Prettier。workspace ルートに集約 |
| SEO | 対策はしない。[7.5](../docs/07_features.md#75-csr-の限界) で CSR の限界として提示し、次の一歩の入り口とする |

### データモデル

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

### エンドポイントと認可

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


## 章をまたぐ参照

参照はファイル間リンクになっています。

```markdown
この点は [6.5](06_api-integration.md#65-認証情報の受け渡し) で認証トークンを…
```

アンカーは GitHub の生成規則で作ります。**小文字化 → 単語文字・空白・ハイフン以外を削除 → 空白1つをハイフン1つに置換**。`ESLint / Prettier` のように、削除された記号の前後に空白が残る見出しは `eslint--prettier` と**ハイフンが2つ**になります。

**節を追加・削除して番号がずれたときは、`docs/` 全体と `_writing/` を横断してリンクを直してください。** `_writing/README.md` の確認事項も章番号を含みます。

参照が特に多いのは以下の経路です。

- [1.4](../docs/01_setup.md#14-safe-chain) サプライチェーン攻撃 → [6.5](../docs/06_api-integration.md#65-認証情報の受け渡し) localStorage のリスク
- [2.12](../docs/02_frontend.md#212-任意-csr--ssg--ssr--isr) CSR/SSG/SSR/ISR → [7.5](../docs/07_features.md#75-csr-の限界) CSR の限界
- [3.3](../docs/03_backend.md#33-最初のエンドポイント-health) メソッドチェーン → [6.3](../docs/06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) Hono RPC
- [3.7](../docs/03_backend.md#37-入力バリデーション) バリデーション → [6.3](../docs/06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) Hono RPC
- [1.6](../docs/01_setup.md#16-リポジトリと-workspace-を作る) `.gitignore` → [3.5](../docs/03_backend.md#35-環境変数とシークレット) 環境変数

## 章ブランチの運用

`main` は「1章 = 1コミット」の直線的な履歴で、`chapter-02` 〜 `chapter-08` はその途中を指しているだけです。**章ブランチを直接編集しないでください。** `main` の履歴を直してから付け直します。

```bash
git rebase -i --root main        # 該当章のコミットを edit → 修正 → git rebase --continue
./_writing/sync-chapters.sh --push
```

具体例と、記事だけを直す場合・新しい章を足す場合の手順は [`README.md`](README.md)（`_writing/README.md`）にあります。

## コミット

- **`git commit` に `-c user.name=` / `-c user.email=` を付けて identity を上書きしないこと。** 素の `git commit` を使い、リポジトリの `git config` の値をそのまま使う
- 章のコードを変えるコミットは、メッセージに「N章」を含める。`_writing/sync-chapters.sh` がこの文字列で章のコミットを探します
