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
| `docs/**`、`NOTES.md`、`README.md`、`CLAUDE.md`、`_writing/**`、`renovate.json` | **先端**（ケース1） | 記事に出てこない。章ブランチには含まれない |

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
