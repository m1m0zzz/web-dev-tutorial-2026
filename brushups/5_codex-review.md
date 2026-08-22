# 5章 codex レビュー（2026-08-23）

[`docs/05_deploy.md`](../docs/05_deploy.md) のレビュー結果です。15件の指摘を **対応済み9件 / コードの修正が要る4件 / 対応しない2件**に分類しました。

## 対応済み（記事）

| # | 指摘 | 確認した事実 | 対応 |
|---|---|---|---|
| 1 | 3つのワークフローを作ると言いながら、`steps` の断片しか載っていない | GitHub Actions 未経験の読者は `on` / `jobs` / `runs-on` / `checkout` を補完できない | **`chapter-05` の3ファイルを全文掲載。** `runs-on` が毎回まっさらなマシンであること、だから `checkout` と `setup-node` が要ることも説明した |
| 2 | ファイルを作るだけで、commit / push する手順が無い | ハンズオンとして完了しない | commit と `git push origin main`、Actions タブでの確認手順を追加 |
| 3 | `VITE_API_URL` をこの時点で登録させているが、API が未デプロイで値が存在しない | フロントがこれを使い始めるのは 6.7 | 5章では登録しないことにし、6.7 に回した |
| 4 | `BETTER_AUTH_SECRET` の生成方法・実行ディレクトリ・確認方法が無い | ルートで実行すると `apps/api/wrangler.jsonc` を選べない | `openssl rand -base64 32` と `--cwd apps/api`、`secret list` での確認を追加。デプロイ後に実行することも明記 |
| 5 | 環境変数の表がリポジトリの実態と違う | API の `vars` は `wrangler.jsonc`、フロントのローカル値は 6.7 の `.env.local` | **「Web / API」×「ローカル / 本番」の表に作り直した。** フロントにシークレットを置く場所が無いこと、`vars` がローカルと本番で共通なことも明記 |
| 6 | `deploy` スクリプトを足すと書いてあるのに、その差分が無い | `chapter-05` の `apps/web/package.json` にはある | 追加 |
| 9 | 5章の時点で本番の何が動き、何が動かないかが書かれていない | `chapter-05` の `wrangler.jsonc` は `CORS_ORIGIN` が localhost のまま | 「確認するのはデプロイの仕組みが動くことだけ。ログインとメモの操作は 6.7 まで本番では動かない」と明記 |
| 10 | 公開 URL をどこで確認するのか、何が出れば成功なのかが無い | — | `Deploy Worker` ステップのログに出ることと、API / フロント / `/posts/test` の3つの確認を表にした |
| 14 | 「`BETTER_AUTH_SECRET` が漏れると誰でも有効なトークンを作れる」は実装より強い | セッションは D1 に保存されており、Bearer 値はランダムなセッショントークン | 「署名や暗号化に使う鍵で、漏れると認証データの偽造・復号につながる」に書き換え |
| 15 | 「`ci.yml` が通ってからデプロイすることはできません」は言い過ぎ | 1つのワークフローにまとめる、`workflow_run` を使うなどの方法はある | 「同じ push から独立して起動する3つのワークフローの間では `needs` で待てない」に限定 |

## コードの修正が要る（未対応）

**いずれも `.github/workflows/*.yml` や `wrangler.jsonc` の変更で、5章（または3章）のコミットに入れる必要があります**（ケース2）。今回は記事の見直しに絞ったため、手を付けていません。

| # | 指摘 | 状況 |
|---|---|---|
| 7 | safe-chain が `ci.yml` にしか無く、**Cloudflare の強い権限を使うデプロイジョブの `npm ci` は保護されていない** | [`_writing/README.md`](../_writing/README.md) に既知として記録済み。3つのワークフローに入れるか、composite action にまとめるかの判断が要る |
| 8 | `apps/web/wrangler.jsonc` の `"$schema": "node_modules/wrangler/config-schema.json"` は存在しないパス | **実際に確認した。** workspace のため `wrangler` はルートに hoist されており、`apps/web/node_modules/wrangler/` は無い。`../../node_modules/...` が正しい。API 側も同じ。デプロイには影響せず、エディタの補完だけが効かない |
| 13 | ワークフローに `permissions` の指定が無い | `GITHUB_TOKEN` の権限がリポジトリの既定値に依存する。5.1 で「最小権限」を説明している以上、`permissions: { contents: read }` を明示するのが筋 |

## 対応しない

| # | 指摘 | 理由 |
|---|---|---|
| 11 | `concurrency` が無く、連続 push で古いデプロイが後勝ちしうる | [`codex-review.md`](../_writing/codex-review.md) のコードレビューで既に「対応しない」に分類済み。学習用のアプリで、説明する概念を増やすほうの害が大きい |
| 12 | Action をメジャータグではなく commit SHA で固定すべき | 同上。1章のサプライチェーンの話と整合しないという指摘は筋が通るが、**記事の読者が毎回 SHA を調べる手順を負う**ほうを避けた |
