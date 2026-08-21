# codex によるコードレビュー（2026-08-21）

各章のコミットを `codex exec --sandbox read-only` でレビューした結果です。33件の指摘を、**対応する / 要検証 / 対応しない**に分類しました。

コマンド:

```bash
codex exec --sandbox read-only "コミット <sha>（N章）が導入したコードをレビューしてください …" < /dev/null
```

> [!NOTE]
> 分類は執筆者の判断です。**「対応しない」は指摘が誤りという意味ではありません。** このチュートリアルは Web/JS が初めての読者を対象にしており、章の目的から外れるものは意図的に落としています。

## 対応済み

| 章 | 場所 | 内容 | 対応 |
|---|---|---|---|
| 2 | `apps/web/index.html` | `lang="en"` のまま | `lang="ja"` に変更（2章のコミット） |
| 2 | `apps/web/src/App.tsx` | `setPosts(...)` が値形式。記事 2.4 の「前の値を使うときは関数形式」と食い違う | コードを `setPosts((prev) => ...)` に統一し、記事 2.2 / 2.4 / 2.6 の掲載コードも直した |
| 2 | `apps/web/README.md` | oxlint 前提のテンプレート README が残っている | 削除。2.10 の oxlint を外す手順に `rm` を追加し、生成ファイルの表にも行を足した |
| 2 | `docs/02_frontend.md` 2.9 | 「CRUD 関数は 2.6 と同じ」だが `addPost` は引数を取る形に変わっている | 2.9 に `addPost` の最終形を掲載した |
| 3 | `apps/api/package.json` | `typescript` と `@types/node` が無く、hoisting で偶然動いている | 両方を devDependencies に追加し、`package-lock.json` を再生成（3章のコミット） |
| 5 | `docs/05_deploy.md` | 表では 5章の `ci.yml` が E2E も実行することになっている | 「E2E は8章で足します」に修正 |
| 7 | `PostItem.tsx` | 一覧に公開状態が出ない（7.1 の完了条件） | 公開中 / 非公開のバッジを追加（7章のコミット） |
| 7 | `PostDetailPage.tsx` | 公開メモの URL をコピーする UI が無い | 公開中のときだけ共有 URL とコピーボタンを表示 |
| 7 | `PostDetailPage.tsx` | 本文の改行が `<p>` で潰れる | `.post-content { white-space: pre-wrap }` |
| 8 | `docs/08_e2e.md` | `getByLabelText` は Testing Library の API 名 | `getByLabel` に修正し、間違えやすい点として明記 |
| 8 | `docs/08_e2e.md` | 掲載コードが未定義の `createPost()` を呼ぶ | ヘルパーの定義も掲載した |

対応後に `npm run lint` / `typecheck` / 単体テスト（web 5件・api 13件）/ E2E 6件がすべて通ることを確認しています。

## 要検証

実際に動かして確かめてから判断します。

| 章 | 内容 | 備考 |
|---|---|---|
| 4 | 「テスト間でストレージは自動ではリセットされない」という記事の記述は誤りで、`vitest-pool-workers` は既定でテストごとに分離する、という指摘 | **記事の記述は実測に基づいています**（消し忘れると2つ目以降のサインアップが `USER_ALREADY_EXISTS` になった）。分離されるのは KV/R2 などで D1 は別、という可能性がある |
| 4 | `cloudflare:test` の `SELF` / `env` は 0.22 で非推奨。`cloudflare:workers` の `env` と `exports.default.fetch()` を使う | 事実なら記事ごと直す。型定義と CHANGELOG で確認する |
| 6 | `queryClient.clear()` ではログアウト後に `useSession()` が更新されず、画面が残る | 手元で再現するか確認する |
| 8 | `playwright.config.ts` の D1 リセットは webServer 起動時のみ。既存サーバーを再利用するローカル実行では走らない | 記事の「テストごとにリセット」という書き方を直す必要があるかもしれない |

## 対応しない（このチュートリアルの範囲外）

| 章 | 内容 | 理由 |
|---|---|---|
| 3 | `userId` が `/auth/update-user` で変更できてしまう | 指摘としては正しい。ただし更新 API を塞ぐ話は認証の章の主題から外れる。**扱うなら7章以降で節を立てる** |
| 3 | Better Auth のレート制限がメモリ保存で Workers では効かない | 同上。運用の話題として9章に回す候補 |
| 3 | `user_id` / `is_public` / `updated_at` にインデックスが無い | D1 の課金は走査行数なので実務では重要。**インデックスの節を立てる価値はある** |
| 5 | `wrangler.jsonc` の `database_id: "local"` と localhost のままの `CORS_ORIGIN` / `BETTER_AUTH_URL` | 読者が自分の値に置き換える前提。リポジトリのコードとしては置き換えられない |
| 5, 8 | デプロイと E2E のジョブでも safe-chain を入れる | 一貫性としては正しい。CI の記述量が増えるので保留 |
| 5 | Actions を可変タグではなくコミット SHA で固定する | 実務では正しいが、初学者向けの `.yml` としては読みにくくなる |
| 5 | デプロイに `concurrency` を設定する | 同上 |
| 6 | ログアウトでサーバー側セッションを失効させていない | 指摘は正しい。**6.5 に追記する価値はある**（`POST /auth/sign-out`） |
| 6 | 401 でログイン画面へ飛ばす共通処理が未実装 | 6.4 の「扱うこと」に書いてあるので、記事側を「読者の課題」と明示する方向で調整 |
| 6, 7 | `mutateAsync` の失敗を捕捉していない / 404 とそれ以外を区別していない | エラー処理を厚くすると章が膨らむ。**9章か「この先」に回す** |
| 7 | 公開トグルが未保存の入力も一緒に保存してしまう | 挙動としては指摘のとおり。直すなら公開専用の API が要る |
| 8 | ログイン画面を通るシナリオが無い（サインアップ後の自動ログインのみ） | シナリオを1つ足すか、記事の記述を実装に合わせる |
| 8 | CI の artifact が空になる（reporter が `dot` なので `playwright-report/` が出ない） | `test-results/` を上げる形に直すのは容易。次の CI 更新に含める |
