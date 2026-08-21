# 1 環境構築

この章では、以降の章で使う開発環境を用意し、[1.8](#18-リポジトリと-workspace-を作る) でアプリのリポジトリを作ります。「任意)」と付いた節は、飛ばしても先に進めます。

## 1.1 WSL2 (Ubuntu)

Node.js のツールチェーンは Linux 環境を前提に作られているものが多く、Windows ネイティブで動かすとパスの区切り文字や改行コード、シンボリックリンクの扱いで問題が出ます。Linux 環境を Windows 上に用意することで、これらを回避します。

https://learn.microsoft.com/ja-jp/windows/wsl/install

インストール後、Ubuntu を起動して以下を実行します。

```bash
sudo apt update && sudo apt upgrade
sudo apt install -y build-essential
```

コマンドがエラーなく終わり、PowerShell で `wsl -l -v` を実行して Ubuntu が `VERSION 2` と表示されれば成功です。Ubuntu 内の `whoami` が、自分で設定したユーザー名を返すことも確認してください。

**つまずきポイント**

> [!TIP]
> - **作業ディレクトリは必ず Linux 側（`~/` 配下）に置いてください。** `/mnt/c/Users/...` は Windows のファイルシステムをマウントしたもので、ファイルアクセスが桁違いに遅くなります。`node_modules` のように小さいファイルを大量に読み書きする場面で顕著に効きます
> - Ubuntu の初回起動時に設定するユーザー名とパスワードは、Windows のアカウントとは無関係です。`sudo` を使うたびに要求されるので忘れないように
> - **`sudo apt update && sudo apt upgrade` は必ず実行してください。** WSL で配布される Ubuntu のイメージは、ダウンロードした時点で既に数か月分の更新が溜まっていることがあります。この状態のまま進むと、[1.3](#13-nvm) 以降で「公式手順どおりにやったのに動かない」という形で問題が表面化します（古い `curl` が新しい TLS 設定に対応していない、証明書が期限切れになっている、など）。原因が分かりにくく、切り分けに時間を取られる種類のエラーです
> - `apt upgrade` は途中で「続行しますか?」と確認を求めます。`y` を入力してください。初回は数分かかることがあります
> - **`build-essential` も同時に入れておいてください。** C/C++ のコンパイラ一式です。npm パッケージの中には、インストール時に C++ のコードをその場でコンパイルするもの（ネイティブモジュール）が含まれることがあり、コンパイラが無いと `node-gyp` のエラーで失敗します。エラーメッセージから原因を特定しづらいので、先に入れておくほうが安全です

Microsoft は WSL 上での開発環境構築ガイドも公開しています。Git や認証まわりも含めて一通り確認したい場合はこちらを参照してください。

https://learn.microsoft.com/ja-jp/windows/wsl/setup/environment

## 1.2 VS Code + WSL 拡張

VS Code 本体は Windows 側にインストールし、WSL 拡張を通して Linux 側のファイルを編集します。この構成にすると、VS Code の統合ターミナルがそのまま Ubuntu のシェルになり、拡張機能も Linux 側で動きます。

https://code.visualstudio.com/docs/remote/wsl

Ubuntu のターミナルで `code .` を実行すると VS Code が開き、左下に「WSL: Ubuntu」と表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - VS Code 本体を WSL 内に `apt` で入れないでください。Windows 側に入れた本体に WSL 拡張を追加するのが正しい構成です
> - 拡張機能には「Windows 側にインストールされるもの」と「WSL 側にインストールされるもの」があります。言語サポート系（TypeScript、ESLint など）は WSL 側に入れる必要があり、拡張機能の一覧に「WSL: Ubuntu にインストール」ボタンが出ます
> - Windows のエクスプローラーから `\\wsl$\Ubuntu\...` を開いて編集することもできますが、この記事では扱いません

## 1.3 nvm

Node.js のバージョンを切り替えるためのツールです。プロジェクトごとに要求される Node.js のバージョンは異なり、複数のプロジェクトを並行して触ると必ず衝突します。nvm を入れておくと、ディレクトリを移動するだけで適切なバージョンに切り替わる状態を作れます。

https://github.com/nvm-sh/nvm#install--update-script

新しいターミナルを開いて `command -v nvm` を実行し、`nvm` と表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - **`which nvm` では確認できません。** nvm はシェル関数として読み込まれるもので、実行可能ファイルではないためです。公式が案内している通り `command -v nvm` を使ってください
> - インストール直後は現在のターミナルに反映されていません。ターミナルを開き直すか、`source ~/.bashrc` を実行してください
> - WSL で `Could not resolve host: raw.githubusercontent.com` が出る場合、DNS の設定が原因のことがあります。公式 README の WSL Troubleshooting に対処法があります: https://github.com/nvm-sh/nvm#wsl-troubleshooting

### LTS 版の Node.js をインストールする

LTS (Long Term Support) は長期サポート対象のリリースラインで、偶数バージョンが該当します。特別な理由がない限り LTS を使います。

https://github.com/nvm-sh/nvm#long-term-support

```bash
nvm install --lts
nvm alias default 'lts/*'
```

1行目で最新の LTS をインストールし、2行目で新しいターミナルを開いたときのデフォルトに設定します。

新しいターミナルを開き、`node -v` と `npm -v` がバージョンを返せば成功です。

**つまずきポイント**

> [!TIP]
> - `lts/*` のクォートは必要です。付けないとシェルがワイルドカードとして解釈します
> - `nvm alias default` を設定しないと、新しいターミナルを開くたびに `node: command not found` になります

### `cd` したときに自動でバージョンを切り替える

プロジェクトのルートに `.nvmrc` というファイルを置くと、そのプロジェクトが要求する Node.js のバージョンを宣言できます。ただし標準では、ディレクトリを移動したあとに `nvm use` を手動で叩く必要があります。これを自動化します。

https://github.com/nvm-sh/nvm#bash

上記リンク先にある `cdnvm` 関数を `$HOME/.bashrc` の末尾に貼り付けます。

貼り付けたらターミナルを開き直し、次の手順で動作を確認します。

```bash
mkdir -p ~/nvmrc-test && cd ~/nvmrc-test
echo "lts/*" > .nvmrc
cd ..
cd nvmrc-test   # ここで "Now using node ..." と表示されれば成功
```

確認できたら `cd ~ && rm -rf ~/nvmrc-test` で片付けてください。

**つまずきポイント**

> [!TIP]
> - **貼り付ける位置は、nvm を読み込む行より後でなければなりません。** nvm のインストーラが `.bashrc` に追記した `[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"` の行より下に置いてください。上に置くと `nvm_find_up: command not found` になります
> - このスクリプトは `cd` をエイリアスで置き換えます。副作用として、`cd` するたびに `.nvmrc` の探索が走るぶんだけ動作が重くなります
> - **公式 README はこのレシピを「利用者から寄せられたもので、nvm のメンテナはサポートしない」と明示しています。** 動かなくなったときに公式のサポートは期待できない点は理解した上で使ってください
> - zsh を使っている場合はスクリプトが異なります: https://github.com/nvm-sh/nvm#zsh

## 1.4 safe-chain

### サプライチェーン攻撃とは

自分が書いたコードに問題がなくても、依存しているパッケージが侵害されれば被害を受けます。これがサプライチェーン攻撃です。

npm のエコシステムでは、この攻撃が繰り返し発生しています。典型的な流れはこうです。

1. 攻撃者が、広く使われているパッケージのメンテナのアカウントを乗っ取る（フィッシングが多い）
2. そのパッケージに悪意あるコードを仕込んだ新バージョンを公開する
3. `npm install` した開発者のマシンで、インストール時のスクリプトが実行される
4. 環境変数、`.npmrc` のトークン、クラウドの認証情報などが外部に送信される

被害の範囲は、直接依存しているパッケージだけではありません。依存の依存、そのまた依存まで含めた全体（依存ツリー）のどこか1つが侵害されれば成立します。中規模のプロジェクトでも依存ツリーには数百から千を超えるパッケージが含まれるため、すべてを人力で監査することは現実的ではありません。

XSS に対するエスケープや SQL インジェクションに対するプレースホルダのような、決定版と言える対策は今のところ存在しません。現実的なのは多層防御です。

- **インストール時にマルウェアを検知してブロックする**（この節で導入する safe-chain がこれにあたります）
- **公開直後のバージョンを避ける**（悪意あるバージョンは公開後まもなく検知・削除されることが多いため、一定時間待つだけでかなり避けられます）
- **ロックファイルをコミットし、CI では `npm ci` を使う**（意図しないバージョンへの更新を防ぐ）
- **`npm audit` などで既知の脆弱性を定期的に確認する**（マルウェアではなく脆弱性向けですが、別の層として有効です）

なお、これは「対策すれば安全」という話ではなく「被害の確率を下げる」話です。この点は [6.5](06_api-integration.md#65-認証情報の受け渡し) で認証トークンを localStorage に保存する際にもう一度触れます。

### 導入

safe-chain は Aikido Security が提供する OSS の CLI ツールで、`npm` や `npx` などのコマンドをラップし、インストールしようとしているパッケージがマルウェアとして報告されていないかを事前に確認します。無償で、アカウント登録もトークンも不要です。

https://github.com/AikidoSec/safe-chain#installation

インストールしたらターミナルを開き直し、`npm safe-chain-verify` を実行します。`OK: Safe-chain works!` と表示されれば成功です。さらに検証用の

```bash
npm install safe-chain-test
```

がブロックされれば、マルウェア検知が実際に動作していることを確認できます（このパッケージは動作確認用にマルウェアとして登録されています）。

**つまずきポイント**

> [!TIP]
> - **かつては `npm install -g @aikidosec/safe-chain` でインストールする方式でしたが、現在は配布用のインストールスクリプトを使う方式に変わっています。** 古い記事を参考にしないでください
> - インストール後は必ずターミナルを開き直してください。パッケージマネージャのコマンドを差し替えるエイリアスが、再起動しないと読み込まれません
> - **既定では、公開から48時間が経過していないバージョンはインストール対象から外されます。** [2章](02_frontend.md)以降で「最新版のはずなのに1つ前のバージョンが入る」ことがありますが、これは異常ではなく意図された挙動です。`--safe-chain-minimum-package-age-hours` で変更できます
> - `.bashrc` への追記が nvm のものと並ぶことになります。動作がおかしい場合は、両者の記述順を確認してください

## 1.5 gh (GitHub CLI)

GitHub をコマンドラインから操作するツールです。この記事では主に認証のために使います。`gh auth login` を実行すると、GitHub CLI 自体の認証に加えて、`git push` する際の認証も同時に設定できます。ブラウザでトークンを発行して手動で設定する手間がなくなります。

https://github.com/cli/cli/blob/trunk/docs/install_linux.md

「Debian, Ubuntu Linux, Raspberry Pi OS (apt)」の節を参照してください。

インストール後、認証します。

```bash
gh auth login
```

対話形式で聞かれるので、以下のように答えます。

- What account do you want to log into? → **GitHub.com**
- What is your preferred protocol for Git operations? → **HTTPS**
- Authenticate Git with your GitHub credentials? → **Yes**
- How would you like to authenticate? → **Login with a web browser**

`gh auth status` がログイン済みのアカウント名を表示すれば成功です。

**つまずきポイント**

> [!TIP]
> - **`gh auth login` は Git のユーザー名とメールアドレスを設定しません。** これは別途必要です。設定しないと最初のコミットで失敗します
>
>   ```bash
>   git config --global user.name "Your Name"
>   git config --global user.email "you@example.com"
>   ```
>
>   メールアドレスを公開したくない場合は、GitHub が提供する `noreply` アドレスを使えます: https://docs.github.com/ja/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address
>
> - Ubuntu には `git` が入っていない場合があります。`git --version` で確認し、無ければ `sudo apt install git` を実行してください
> - ブラウザ認証では WSL 内から Windows 側のブラウザが開きます。開かない場合は表示される URL を手動でコピーしてください

## 1.6 任意) ターミナル操作に慣れる

以降の章はすべてターミナル上で進みます。以下のコマンドは説明なしで使うので、初めて見るものがあればこの時点で触っておいてください。

| コマンド | 用途 |
|---|---|
| `pwd` | 今いるディレクトリを表示する |
| `ls` / `ls -la` | ファイル一覧（`-a` で隠しファイル、`-l` で詳細） |
| `cd` | ディレクトリを移動する |
| `mkdir` / `mkdir -p` | ディレクトリを作る（`-p` で親も同時に） |
| `rm` / `rm -rf` | 削除する |
| `cp` / `mv` | コピー / 移動・リネーム |
| `cat` / `less` | ファイルの内容を見る |
| `chmod` | 実行権限などを変更する |

**つまずきポイント**

> [!TIP]
> - `rm -rf` に確認はありません。特にホームディレクトリ直下で実行するときは、パスを2回読んでから Enter を押してください
> - ドットで始まるファイル（`.bashrc`、`.nvmrc`、`.env`）は `ls` では表示されません。`ls -a` を使ってください
> - Tab キーでパスが補完されます。手で打つよりタイプミスが減ります

## 1.7 任意) ghq

リポジトリを `~/ghq/github.com/{ユーザー名}/{リポジトリ名}` という規則的なパスに配置してくれるツールです。リポジトリが増えてくると、どこにクローンしたか分からなくなる問題を解消できます。

https://github.com/x-motemen/ghq#installation

`ghq get <リポジトリURL>` でクローンでき、`ghq list` に表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - 導入は必須ではありません。この記事で作るのは1リポジトリだけなので、恩恵を感じるのは他のプロジェクトを扱い始めてからです
> - `fzf` と組み合わせると、一覧から絞り込んでリポジトリに移動できます。[9.1](09_devtools.md#91-ghq--fzf-でリポジトリを移動する) で扱います

## 1.8 リポジトリと workspace を作る

フロントエンドとバックエンドを1つのリポジトリで管理します。npm workspaces を使うことで、依存のインストールを一度で済ませ、[6章](06_api-integration.md)でフロントからバックエンドの型を参照できるようにします。

GitHub の Web UI から新規リポジトリを作成します。

https://github.com/new

| 項目 | 設定 |
|---|---|
| Repository name | 任意（この記事では `memo-app` とします） |
| Visibility | **Private** |
| Add a README file | チェックする |
| Add .gitignore | **Node** を選択 |
| Choose a license | 設定しない |

作成後、WSL のターミナルから任意のディレクトリでクローンします。

```bash
git clone https://github.com/<ユーザー名>/memo-app.git
cd memo-app
```

**[1.7](#17-任意-ghq) の ghq を入れた場合は、代わりに `ghq get` を使ってください。** 置き場所を自分で決めずに済みます。

```bash
ghq get https://github.com/<ユーザー名>/memo-app.git
cd $(ghq root)/github.com/<ユーザー名>/memo-app
```

`~/ghq/github.com/<ユーザー名>/memo-app` に置かれます。この記事では以降 `memo-app` ディレクトリと書きますが、それはこのパスのことです。

> 先にローカルで作ってから GitHub に上げたい場合は `ghq create <ユーザー名>/memo-app` です。ただしこのコマンドがやるのは `git init` までで、**リモートの設定はされません**（`git remote add origin ...` は自分で行います）。この記事は GitHub 側で作ってからクローンする順番で進めます。

`git log` に初回コミットが表示され、`ls -a` で `.gitignore` と `README.md` が確認できれば成功です。

**つまずきポイント**

> [!TIP]
> - **クローン先は Linux 側（`~/` 配下）にしてください。** `/mnt/c/` 配下に置くとファイルアクセスが極端に遅くなります（[1.1](#11-wsl2-ubuntu) 参照）
> - [1.5](#15-gh-github-cli) で `gh auth login` を済ませていれば、HTTPS でのクローンとプッシュに認証情報の入力は不要です。求められる場合は `gh auth status` で認証状態を確認してください
> - Visibility を Private にしていますが、これは後述する `package.json` の `"private": true` とは無関係の設定です。前者は「GitHub 上で他人から見えるか」、後者は「npm に公開できるか」の話です

### `.nvmrc` を作る

このプロジェクトで使う Node.js のバージョンを宣言します。[1.3](#13-nvm) で設定した自動切り替えが、このファイルを見て動作します。

```bash
echo "24" > .nvmrc
```

> 執筆時点（2026年8月）の Active LTS は **Node.js 24 (Krypton)** です。`nvm install --lts` で入るのもこのラインです。読者の環境では、その時点の LTS に読み替えて構いません。`nvm ls-remote --lts` で確認できます。

メジャーバージョンのみを書いています。パッチバージョンまで固定すると、更新のたびに `nvm install` が走り、記事も古くなります。逆に `lts/*` と書くと LTS ラインが切り替わったときに読者ごとに異なるバージョンが入るため、再現性が下がります。

一度ディレクトリを出て入り直すと（`cd .. && cd memo-app`）、`Now using node v24...` と表示されます。

### `.gitignore` に追記する

Node テンプレートには `node_modules/` や `.env` 系が既に含まれています。ここに、あとの章で生成されるものを追記します。使うのは[3章](03_backend.md)以降ですが、シークレットや生成物を誤ってコミットする窓を開けないよう、先に設定しておきます。

```
# Cloudflare
.wrangler/
.dev.vars
.dev.vars.*
*.sqlite
*.sqlite-journal

# Playwright
test-results/
playwright-report/
```

`.dev.vars` は Cloudflare Workers のローカル開発で環境変数とシークレットを書くファイルです（[3.5](03_backend.md#35-環境変数とシークレット) で扱います）。**API キーや認証用のシークレットが平文で入るため、絶対にコミットしてはいけません。**

ローカルの D1（[3.6](03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) で使うデータベース）の実体は、以下の場所に作られます。

```
apps/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<ハッシュ>.sqlite
```

`.wrangler/` を丸ごと無視しているので、この SQLite ファイルもコミット対象から外れます。`*.sqlite` の2行は保険です（`wrangler` の実行位置によっては別の場所に出ることがあるため）。

`test-results/` と `playwright-report/` は、[8章](08_e2e.md)の E2E テストが吐く実行結果とレポートです。テストを走らせるたびに中身が変わるので、コミットする意味がありません。**先に書いておかないと、`git add -A` で一度混入してしまいます。** 一度追跡されたファイルは、あとから `.gitignore` に書いても無視されず、`git rm --cached` が必要になります。

**つまずきポイント**

> [!TIP]
> - [3章](03_backend.md)で `npm create hono@latest` を実行すると、`apps/api/` 配下にも `.gitignore` が生成されます。内容が重複する場合はそちらを整理しますが、ルート側の記述は残してください。`wrangler` の実行ディレクトリによっては、ルート側に `.wrangler/` が作られることがあります

### workspace を設定する

ルートに `package.json` を作ります。

```bash
npm init -y
```

生成された内容を、以下のように書き換えます。

```json
{
  "name": "memo-app",
  "private": true,
  "workspaces": ["apps/*"]
}
```

**`"private": true` は必須です。** これが無いと `npm publish` を誤って実行でき、Private リポジトリのコードが npm に公開されてしまいます。また npm workspaces はルートパッケージが private であることを前提としています。

`"workspaces": ["apps/*"]` により、`apps/` 配下の各ディレクトリが1つのパッケージとして扱われます。この記事では `apps/web`（[2章](02_frontend.md)）と `apps/api`（[3章](03_backend.md)）を作ります。

`npm init -y` が生成した `"main"`、`"scripts"`、`"keywords"` などは、ルートでは使わないので削除して構いません。

```bash
mkdir -p apps
```

`npm pkg get workspaces` を実行して `[ 'apps/*' ]` と表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - **`npm ls --workspaces` はこの時点では `No workspaces found!` で失敗します。** `apps/` の下にまだパッケージが1つも無いためです。異常ではありません。[2.1](02_frontend.md#21-npm-create-vitelatest) で `apps/web` を作ると通るようになります

### コミットする

```bash
git add .
git commit -m "chore: setup npm workspaces"
git push
```

## 1.9 任意) Claude Code

ターミナル上で動くコーディングエージェントです。コードベースを読んだうえで、実装やリファクタリング、調査を任せられます。以降の章で、分からないことを聞く相手として使えます。

**扱うこと**

- インストールと認証
- `AGENTS.md`（`CLAUDE.md`）によるプロジェクト固有の指示
- 権限設定

WSL のターミナルで実行します（Windows 側ではなく、WSL の中に入れます）。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

`claude --version` がバージョンを表示し、`claude doctor` が設定の診断結果を表示すれば成功です。プロジェクトのディレクトリで `claude` を実行すると、対話セッションが始まります。

**つまずきポイント**

> [!TIP]
> - **利用には Pro / Max / Team / Enterprise / Console のいずれかのアカウントが必要です。** 無料の Claude.ai プランには含まれません
> - 初回は `claude` を実行するとブラウザでのログインを求められます
> - npm でグローバルインストールする方法もありますが、**`sudo npm install -g` は使わないでください**（権限の問題が起きます）
> - ネイティブインストーラで入れた場合、更新はバックグラウンドで自動的に行われます

参考: https://code.claude.com/docs/en/setup

---

**この章のコード**: `chapter-01` ブランチ
