# Web アプリ開発 学習ロードマップ

ハンズオン的に学べる学習ロードマップです。

**ゴール: 認証付きの公開メモアプリを Cloudflare にデプロイする**

自分のメモを作成・編集でき、公開設定にしたものは未ログインユーザーからも閲覧できる、というアプリを作ります。

執筆の一部に Claude を使用しています。

---

## この記事について

### 想定読者

プログラミングの経験はあるが、Web / JavaScript のエコシステムは初めて、という方を想定しています。TypeScript と JavaScript は少し触ったことがある程度で構いません。

### 前提環境

Windows + WSL2 (Ubuntu) を前提としています。macOS / Linux を使っている場合は 1.1 を読み飛ばし、1.3 から始めてください。シェルは bash を前提に書いています。

### 進め方

記事本文には、初出の概念は全文を、そこからの変更は差分を載せています。完成コードはリポジトリを参照してください。

https://github.com/m1m0zzz/web-dev-tutorial-2026

**各章には、その章を終えた時点のコードのブランチが対応しています。** 途中から始めたい場合や、詰まったときに正解を確認したい場合は、対応するブランチを参照してください。`main` は最新の状態です。

| 章 | ブランチ |
|---|---|
| 2 React でフロントエンドを作る | `chapter-02` |
| 3 Hono でバックエンドを作る | `chapter-03` |
| 4 テストを書く | `chapter-04` |
| 5 デプロイする | `chapter-05` |
| 6 フロントから API を呼ぶ | `chapter-06` |
| 7 機能を拡張する | `chapter-07` |
| 8 E2E テストを行う | `chapter-08` |

1章は環境構築だけなので、対応するブランチはありません。9章はコードを変更しません。

途中の章から始める場合は、そのブランチを checkout してから読み進めてください。

```bash
git clone https://github.com/m1m0zzz/web-dev-tutorial-2026.git
cd web-dev-tutorial-2026
git checkout chapter-03   # 3章を終えた時点の状態
npm install
```

### なぜ手順を書かずリンクを貼るのか

1章の環境構築では、具体的な手順を書かず公式ドキュメントへのリンクを示しています。この種のツールはインストール方法が変わりやすく、記事に手順をコピーすると古い情報を参照させてしまうためです。

代わりに、以下の3点を補足します。

- **何のために**: なぜそれを入れるのか
- **完了条件**: どうなれば次に進んでよいのか
- **躓きポイント**: 公式には書かれていないが詰まりやすい点

---

## ロードマップ

1. 環境構築
2. React でフロントエンドを作る
3. Hono でバックエンドを作る
4. テストを書く
5. デプロイする
6. フロントから API を呼ぶ
7. 機能を拡張する
8. E2E テストを行う
9. 任意) 開発環境をさらに整える

**2章で作るのは UI だけ、3章で作るのは API だけです。** 両者は 6章で接続します。同じアプリを段階的に組み立てていく構成だと考えてください。

6章の完了時点で「認証付きの、自分専用のメモアプリ」として一度完成します。7章はそこに公開機能を足す拡張です。

---

# 1 環境構築

この章では、以降の章で使う開発環境を用意します。

## 1.1 WSL2 (Ubuntu)

**何のために**

Node.js のツールチェーンは Linux 環境を前提に作られているものが多く、Windows ネイティブで動かすとパスの区切り文字や改行コード、シンボリックリンクの扱いで問題が出ます。Linux 環境を Windows 上に用意することで、これらを回避します。

**手順**

https://learn.microsoft.com/ja-jp/windows/wsl/install

インストール後、Ubuntu を起動して以下を実行します。

```bash
sudo apt update && sudo apt upgrade
sudo apt install -y build-essential
```

**完了条件**

上記コマンドがエラーなく完了する。PowerShell で `wsl -l -v` を実行し、Ubuntu が `VERSION 2` で表示される。Ubuntu 内で `whoami` が自分で設定したユーザー名を返す。

**躓きポイント**

- **作業ディレクトリは必ず Linux 側（`~/` 配下）に置いてください。** `/mnt/c/Users/...` は Windows のファイルシステムをマウントしたもので、ファイルアクセスが桁違いに遅くなります。`node_modules` のように小さいファイルを大量に読み書きする場面で顕著に効きます
- Ubuntu の初回起動時に設定するユーザー名とパスワードは、Windows のアカウントとは無関係です。`sudo` を使うたびに要求されるので忘れないように
- **`sudo apt update && sudo apt upgrade` は必ず実行してください。** WSL で配布される Ubuntu のイメージは、ダウンロードした時点で既に数か月分の更新が溜まっていることがあります。この状態のまま進むと、1.3 以降で「公式手順どおりにやったのに動かない」という形で問題が表面化します（古い `curl` が新しい TLS 設定に対応していない、証明書が期限切れになっている、など）。原因が分かりにくく、切り分けに時間を取られる種類のエラーです
- `apt upgrade` は途中で「続行しますか?」と確認を求めます。`y` を入力してください。初回は数分かかることがあります
- **`build-essential` も同時に入れておいてください。** C/C++ のコンパイラ一式です。npm パッケージの中には、インストール時に C++ のコードをその場でコンパイルするもの（ネイティブモジュール）が含まれることがあり、コンパイラが無いと `node-gyp` のエラーで失敗します。エラーメッセージから原因を特定しづらいので、先に入れておくほうが安全です

Microsoft は WSL 上での開発環境構築ガイドも公開しています。Git や認証まわりも含めて一通り確認したい場合はこちらを参照してください。

https://learn.microsoft.com/ja-jp/windows/wsl/setup/environment

## 1.2 VS Code + WSL 拡張

**何のために**

VS Code 本体は Windows 側にインストールし、WSL 拡張を通して Linux 側のファイルを編集します。この構成にすると、VS Code の統合ターミナルがそのまま Ubuntu のシェルになり、拡張機能も Linux 側で動きます。

**手順**

https://code.visualstudio.com/docs/remote/wsl

**完了条件**

Ubuntu のターミナルで `code .` を実行すると VS Code が開き、左下に「WSL: Ubuntu」と表示される。

**躓きポイント**

- VS Code 本体を WSL 内に `apt` で入れないでください。Windows 側に入れた本体に WSL 拡張を追加するのが正しい構成です
- 拡張機能には「Windows 側にインストールされるもの」と「WSL 側にインストールされるもの」があります。言語サポート系（TypeScript、ESLint など）は WSL 側に入れる必要があり、拡張機能の一覧に「WSL: Ubuntu にインストール」ボタンが出ます
- Windows のエクスプローラーから `\\wsl$\Ubuntu\...` を開いて編集することもできますが、この記事では扱いません

## 1.3 nvm

**何のために**

Node.js のバージョンを切り替えるためのツールです。プロジェクトごとに要求される Node.js のバージョンは異なり、複数のプロジェクトを並行して触ると必ず衝突します。nvm を入れておくと、ディレクトリを移動するだけで適切なバージョンに切り替わる状態を作れます。

**手順**

https://github.com/nvm-sh/nvm#install--update-script

**完了条件**

新しいターミナルを開いて `command -v nvm` を実行すると `nvm` と表示される。

**躓きポイント**

- **`which nvm` では確認できません。** nvm はシェル関数として読み込まれるもので、実行可能ファイルではないためです。公式が案内している通り `command -v nvm` を使ってください
- インストール直後は現在のターミナルに反映されていません。ターミナルを開き直すか、`source ~/.bashrc` を実行してください
- WSL で `Could not resolve host: raw.githubusercontent.com` が出る場合、DNS の設定が原因のことがあります。公式 README の WSL Troubleshooting に対処法があります: https://github.com/nvm-sh/nvm#wsl-troubleshooting

### LTS 版の Node.js をインストールする

**何のために**

LTS (Long Term Support) は長期サポート対象のリリースラインで、偶数バージョンが該当します。特別な理由がない限り LTS を使います。

**手順**

https://github.com/nvm-sh/nvm#long-term-support

```bash
nvm install --lts
nvm alias default 'lts/*'
```

1行目で最新の LTS をインストールし、2行目で新しいターミナルを開いたときのデフォルトに設定します。

**完了条件**

新しいターミナルを開いて `node -v` と `npm -v` がバージョンを返す。

**躓きポイント**

- `lts/*` のクォートは必要です。付けないとシェルがワイルドカードとして解釈します
- `nvm alias default` を設定しないと、新しいターミナルを開くたびに `node: command not found` になります

### `cd` したときに自動でバージョンを切り替える

**何のために**

プロジェクトのルートに `.nvmrc` というファイルを置くと、そのプロジェクトが要求する Node.js のバージョンを宣言できます。ただし標準では、ディレクトリを移動したあとに `nvm use` を手動で叩く必要があります。これを自動化します。

**手順**

https://github.com/nvm-sh/nvm#bash

上記リンク先にある `cdnvm` 関数を `$HOME/.bashrc` の末尾に貼り付けます。

**完了条件**

```bash
mkdir -p ~/nvmrc-test && cd ~/nvmrc-test
echo "lts/*" > .nvmrc
cd ..
cd nvmrc-test   # ここで "Now using node ..." と表示されれば成功
```

確認できたら `cd ~ && rm -rf ~/nvmrc-test` で片付けてください。

**躓きポイント**

- **貼り付ける位置は、nvm を読み込む行より後でなければなりません。** nvm のインストーラが `.bashrc` に追記した `[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"` の行より下に置いてください。上に置くと `nvm_find_up: command not found` になります
- このスクリプトは `cd` をエイリアスで置き換えます。副作用として、`cd` するたびに `.nvmrc` の探索が走るぶんだけ動作が重くなります
- **公式 README はこのレシピを「利用者から寄せられたもので、nvm のメンテナはサポートしない」と明示しています。** 動かなくなったときに公式のサポートは期待できない点は理解した上で使ってください
- zsh を使っている場合はスクリプトが異なります: https://github.com/nvm-sh/nvm#zsh

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

なお、これは「対策すれば安全」という話ではなく「被害の確率を下げる」話です。この点は 6.5 で認証トークンを localStorage に保存する際にもう一度触れます。

### 導入

**何のために**

safe-chain は Aikido Security が提供する OSS の CLI ツールで、`npm` や `npx` などのコマンドをラップし、インストールしようとしているパッケージがマルウェアとして報告されていないかを事前に確認します。無償で、アカウント登録もトークンも不要です。

**手順**

https://github.com/AikidoSec/safe-chain#installation

**完了条件**

ターミナルを開き直したうえで `npm safe-chain-verify` を実行し、`OK: Safe-chain works!` と表示される。さらに検証用の

```bash
npm install safe-chain-test
```

がブロックされれば、マルウェア検知が実際に動作していることを確認できます（このパッケージは動作確認用にマルウェアとして登録されています）。

**躓きポイント**

- **かつては `npm install -g @aikidosec/safe-chain` でインストールする方式でしたが、現在は配布用のインストールスクリプトを使う方式に変わっています。** 古い記事を参考にしないでください
- インストール後は必ずターミナルを開き直してください。パッケージマネージャのコマンドを差し替えるエイリアスが、再起動しないと読み込まれません
- **既定では、公開から48時間が経過していないバージョンはインストール対象から外されます。** 2章以降で「最新版のはずなのに1つ前のバージョンが入る」ことがありますが、これは異常ではなく意図された挙動です。`--safe-chain-minimum-package-age-hours` で変更できます
- `.bashrc` への追記が nvm のものと並ぶことになります。動作がおかしい場合は、両者の記述順を確認してください

## 1.5 gh (GitHub CLI)

**何のために**

GitHub をコマンドラインから操作するツールです。この記事では主に認証のために使います。`gh auth login` を実行すると、GitHub CLI 自体の認証に加えて、`git push` する際の認証も同時に設定できます。ブラウザでトークンを発行して手動で設定する手間がなくなります。

**手順**

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

**完了条件**

`gh auth status` が、ログイン済みのアカウント名を表示する。

**躓きポイント**

- **`gh auth login` は Git のユーザー名とメールアドレスを設定しません。** これは別途必要です。設定しないと最初のコミットで失敗します

  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  ```

  メールアドレスを公開したくない場合は、GitHub が提供する `noreply` アドレスを使えます: https://docs.github.com/ja/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address

- Ubuntu には `git` が入っていない場合があります。`git --version` で確認し、無ければ `sudo apt install git` を実行してください
- ブラウザ認証では WSL 内から Windows 側のブラウザが開きます。開かない場合は表示される URL を手動でコピーしてください

## 1.6 任意) ターミナル操作に慣れる

**何のために**

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

**躓きポイント**

- `rm -rf` に確認はありません。特にホームディレクトリ直下で実行するときは、パスを2回読んでから Enter を押してください
- ドットで始まるファイル（`.bashrc`、`.nvmrc`、`.env`）は `ls` では表示されません。`ls -a` を使ってください
- Tab キーでパスが補完されます。手で打つよりタイプミスが減ります

## 1.7 任意) ghq

**何のために**

リポジトリを `~/ghq/github.com/{ユーザー名}/{リポジトリ名}` という規則的なパスに配置してくれるツールです。リポジトリが増えてくると、どこにクローンしたか分からなくなる問題を解消できます。

**手順**

https://github.com/x-motemen/ghq#installation

**完了条件**

`ghq get <リポジトリURL>` でクローンでき、`ghq list` に表示される。

**躓きポイント**

- 導入は必須ではありません。この記事で作るのは1リポジトリだけなので、恩恵を感じるのは他のプロジェクトを扱い始めてからです
- `fzf` と組み合わせると `ghq list | fzf` でリポジトリを検索して移動できます。ただし本筋から外れるのでここでは扱いません

---

# 2 React でフロントエンドを作る

この章では UI だけを作ります。データはブラウザのメモリ上に持ち、サーバーとは通信しません。バックエンドとの接続は 6章で行います。

**この章の時点では「公開」という概念は登場しません。** 見せる相手がいないためです。公開機能は 7章で追加します。

## 2.1 リポジトリと workspace を作る

**何のために**

フロントエンドとバックエンドを1つのリポジトリで管理します。npm workspaces を使うことで、依存のインストールを一度で済ませ、6章でフロントからバックエンドの型を参照できるようにします。

**手順**

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

**完了条件**

`git log` に初回コミットが表示され、`ls -a` で `.gitignore` と `README.md` が確認できる。

**躓きポイント**

- **クローン先は Linux 側（`~/` 配下）にしてください。** `/mnt/c/` 配下に置くとファイルアクセスが極端に遅くなります（1.1 参照）
- 1章で `gh auth login` を済ませていれば、HTTPS でのクローンとプッシュに認証情報の入力は不要です。求められる場合は `gh auth status` で認証状態を確認してください
- Visibility を Private にしていますが、これは後述する `package.json` の `"private": true` とは無関係の設定です。前者は「GitHub 上で他人から見えるか」、後者は「npm に公開できるか」の話です

### `.nvmrc` を作る

このプロジェクトで使う Node.js のバージョンを宣言します。1.3 で設定した自動切り替えが、このファイルを見て動作します。

```bash
echo "24" > .nvmrc
```

> 執筆時点（2026年8月）の Active LTS は **Node.js 24 (Krypton)** です。`nvm install --lts` で入るのもこのラインです。読者の環境では、その時点の LTS に読み替えて構いません。`nvm ls-remote --lts` で確認できます。

メジャーバージョンのみを書いています。パッチバージョンまで固定すると、更新のたびに `nvm install` が走り、記事も古くなります。逆に `lts/*` と書くと LTS ラインが切り替わったときに読者ごとに異なるバージョンが入るため、再現性が下がります。

**完了条件**

一度ディレクトリを出て入り直し（`cd .. && cd memo-app`）、`Now using node v24...` と表示される。

### `.gitignore` に追記する

Node テンプレートには `node_modules/` や `.env` 系が既に含まれています。ここに Cloudflare 関連を追記します。3章で使うものですが、シークレットを誤ってコミットする窓を開けないよう、先に設定しておきます。

```
# Cloudflare
.wrangler/
.dev.vars
.dev.vars.*
*.sqlite
*.sqlite-journal
```

`.dev.vars` は Cloudflare Workers のローカル開発で環境変数とシークレットを書くファイルです（3.5 で扱います）。**API キーや認証用のシークレットが平文で入るため、絶対にコミットしてはいけません。**

ローカルの D1（3.6 で使うデータベース）の実体は、以下の場所に作られます。

```
apps/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<ハッシュ>.sqlite
```

`.wrangler/` を丸ごと無視しているので、この SQLite ファイルもコミット対象から外れます。`*.sqlite` の2行は保険です（`wrangler` の実行位置によっては別の場所に出ることがあるため）。

**躓きポイント**

- 3章で `npm create hono@latest` を実行すると、`apps/api/` 配下にも `.gitignore` が生成されます。内容が重複する場合はそちらを整理しますが、ルート側の記述は残してください。`wrangler` の実行ディレクトリによっては、ルート側に `.wrangler/` が作られることがあります

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

`"workspaces": ["apps/*"]` により、`apps/` 配下の各ディレクトリが1つのパッケージとして扱われます。この記事では `apps/web`（2章）と `apps/api`（3章）を作ります。

`npm init -y` が生成した `"main"`、`"scripts"`、`"keywords"` などは、ルートでは使わないので削除して構いません。

```bash
mkdir -p apps
```

**完了条件**

`npm ls --workspaces` がエラーを出さずに実行できる（この時点ではまだ何も表示されません）。

### コミットする

```bash
git add .
git commit -m "chore: setup npm workspaces"
git push
```

## 2.2 `npm create vite@latest`

**何のために**

Vite は開発サーバーとビルドツールです。React のプロジェクトを一から設定するには、TypeScript のコンパイル、JSX の変換、開発サーバー、本番ビルドなど多数の設定が必要ですが、Vite のテンプレートはこれらを揃えた状態で生成してくれます。

**手順**

https://ja.vite.dev/guide/

リポジトリのルートで実行します。

```bash
npm create vite@latest apps/web -- --template react-ts
npm install
npm run dev -w apps/web
```

**完了条件**

ブラウザで `http://localhost:5173` を開き、Vite + React の初期画面が表示される。

**躓きポイント**

- **`npm install` はルートで実行してください。** `apps/web` に `cd` して実行すると workspace の解決が壊れます。以降この記事では、断りがない限りすべてリポジトリのルートで作業します
- 依存関係は原則としてルートの `node_modules/` にまとめられます（hoisting）。`apps/web/node_modules/` はそもそも作られないことがあります。異常ではありません
- パッケージを追加するときは `-w` でワークスペースを指定します。例: `npm i -w apps/web react-router`
- スクリプトの実行も同様です。例: `npm run dev -w apps/web`
- 生成された `apps/web/package.json` には `"private": true` が既に入っているはずです。無ければ追加してください
- WSL から起動した開発サーバーには、Windows 側のブラウザからそのままアクセスできます

### 生成されたファイルを読む

主なファイルの役割を確認しておきます。

| ファイル | 役割 |
|---|---|
| `index.html` | エントリポイント。`<div id="root">` に React が描画される |
| `src/main.tsx` | React の起動処理。`index.html` の `#root` にアプリをマウントする |
| `src/App.tsx` | 最初のコンポーネント。ここから書き換えていく |
| `src/index.css` / `src/App.css` | スタイル。2.9 で書き換えます |
| `public/` | そのまま配信される静的ファイル（`favicon.svg` など） |
| `src/assets/` | コードから `import` して使う画像。バンドラを通ります |
| `vite.config.ts` | Vite の設定 |
| `tsconfig.json` | 他の2つを参照するだけのファイル（Project References） |
| `tsconfig.app.json` | アプリ本体（`src/`）向けの TypeScript 設定 |
| `tsconfig.node.json` | `vite.config.ts` など、Node.js 側で動くファイル向けの設定 |
| `.oxlintrc.json` | oxlint（Lint ツール）の設定。2.11 で扱います |

`public/` と `src/assets/` の違いは、**バンドラを通るかどうか**です。`src/assets/` の画像は `import` して使い、ビルド時にハッシュ付きのファイル名に変換されます。`public/` のファイルはパスをそのまま書いて参照します。

> 執筆時点では `create-vite` 9系が動き、Vite 8 / React 19 / TypeScript 6 の構成が生成されました。バージョンが上がっていても、上記のファイル構成は概ね変わりません。

## 2.3 モダン JavaScript の前提知識

**何のために**

React のコードは、比較的新しい JavaScript の記法を前提に書かれています。この節は通読する必要はありません。各項目に「どこで使うか」を書いてあるので、実際に詰まったときに戻ってきてください。

**扱う項目**

| 項目 | 最初に出てくる場所 |
|---|---|
| `const` / `let` | 2.5 カウンター |
| アロー関数 | 2.5 カウンター（イベントハンドラ） |
| 分割代入（配列） | 2.5 カウンター（`useState` の戻り値） |
| 分割代入（オブジェクト） | 2.8 コンポーネント分離（Props の受け取り） |
| スプレッド構文 | 2.7 メモリスト（配列への追加、オブジェクトの更新） |
| `import` / `export` | 2.8 コンポーネント分離 |
| テンプレートリテラル | 2.6 タイマー（時間の表示） |
| 配列メソッド（`map` / `filter`） | 2.7 メモリスト |

**扱わないもの**

- クラス構文、`this`、プロトタイプ（このロードマップでは登場しません）
- `async` / `await` と Promise（6.0 で扱います）

網羅的に学びたい場合は MDN を参照してください。

https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide

**この先の章に実際に出てくる形**

```ts
// const / let（2.5）— 再代入しない変数は const。この記事のコードはほぼ const だけで書けます
const [count, setCount] = useState(0)

// アロー関数（2.5）— イベントハンドラとして渡す関数
const increment = () => {
  setCount((prev) => prev + 1)
}

// 分割代入・配列（2.5）— useState は [値, 更新関数] の2要素の配列を返します
const [posts, setPosts] = useState<Post[]>([])

// 分割代入・オブジェクト（2.8）— Props を受け取るときの形
export function PostList({ posts, onDelete }: Props) {

// スプレッド構文（2.7）— 配列に追加する / オブジェクトの一部だけを差し替える
setPosts([...posts, newPost])
setPosts(posts.map((post) => (post.id === id ? { ...post, ...values } : post)))

// import / export（2.8）
import { PostItem } from './PostItem'
export function PostList(props: Props) {

// テンプレートリテラル（2.6, 2.8）— `` で囲み、${} の中に式を書きます
`経過時間: ${seconds} 秒`
<Link to={`/posts/${post.id}`}>

// 配列メソッド map / filter（2.7）
posts.map((post) => post.title)      // 各要素を変換した新しい配列
posts.filter((post) => post.id !== id) // 条件に合う要素だけの新しい配列
```

**`map` と `filter` は、元の配列を変更せず新しい配列を返します。** React で状態を更新するときに、この性質がそのまま効いてきます（2.7 の躓きポイント）。

## 2.4 TypeScript と JSX の読み方

**何のために**

JSX は JavaScript の中に HTML のような記法を書ける拡張構文です。TypeScript は JavaScript に型を追加した言語です。React では両者を組み合わせて書きます。

この節も索引として使ってください。

**扱う項目**

| 項目 | 最初に出てくる場所 |
|---|---|
| JSX の基本（`{}` 埋め込み、`className`、単一ルート、自己閉じタグ） | 2.5 カウンター |
| 型注釈の基本（`string` / `number` / `boolean`） | 2.5 カウンター |
| `useState` のジェネリクスと型推論 | 2.5 カウンター |
| `type` によるオブジェクト型の定義 | 2.7 メモリスト |
| Props の型定義 | 2.8 コンポーネント分離 |
| 配列の型（`Post[]`） | 2.7 メモリスト |
| `key` とリスト描画 | 2.7 メモリスト |

**扱わないもの**

- ジェネリクスの自作、条件型、`keyof` などの型レベル操作
- `enum`、名前空間、デコレータ

網羅的に学びたい場合は TypeScript Handbook を参照してください。

https://www.typescriptlang.org/ja/docs/handbook/intro.html

**躓きポイント**

- HTML の `class` は JSX では `className` になります。`class` が JavaScript の予約語のためです
- 同様に `for` は `htmlFor` になります
- JSX は単一のルート要素しか返せません。複数並べたい場合は `<>...</>`（フラグメント）で囲みます

**この先の章に実際に出てくる形**

```tsx
// JSX の {} 埋め込みと className（2.5, 2.9）
<p>現在の値: {count}</p>
<li className="post-item">

// 自己閉じタグ（2.7）— 子要素を持たない要素は /> で閉じます
<textarea value={content} onChange={(e) => setContent(e.target.value)} />

// useState のジェネリクスと型推論（2.5, 2.7）
const [count, setCount] = useState(0)          // 初期値 0 から number と推論される
const [posts, setPosts] = useState<Post[]>([]) // [] からは推論できないので <Post[]> で明示する

// type によるオブジェクト型の定義（2.7）
type Post = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

// Props の型定義（2.8）— 関数を受け取る Props も型で書けます
type Props = {
  posts: Post[]                    // 配列の型
  onDelete: (id: string) => void   // 「string を1つ受け取り、何も返さない関数」
}

// key とリスト描画（2.7）
{posts.map((post) => (
  <PostItem key={post.id} post={post} onDelete={onDelete} />
))}

// import type（2.8）— 型だけを import するときの書き方。6.3 で重要になります
import type { Post } from '../types'
```

## 2.5 カウンター

**何のために**

React の中心的な概念である「状態 (state)」を理解します。ボタンを押すと数字が増える、という最小のアプリを作ります。

**扱うこと**

- `useState` による状態の宣言
- イベントハンドラ（`onClick`）
- 状態が変わると再描画されるという仕組み
- 状態を直接書き換えてはいけない理由

**完了条件**

ボタンを押すと画面の数字が増える。リセットボタンで 0 に戻る。

**躓きポイント**

- `count = count + 1` のように直接代入しても画面は更新されません。必ず `setCount` を使います
- `setCount(count + 1)` を連続で呼んでも、期待通りに 2 増えるとは限りません。前の値を使う場合は `setCount(prev => prev + 1)` の形を使います
- `onClick={handleClick()}` と書くと、レンダリング時に即座に実行されてしまいます。`onClick={handleClick}` が正しい形です

**コード**

まず、テンプレートに含まれるサンプルを片付けます。

```bash
rm -rf apps/web/src/assets apps/web/src/App.css
```

`apps/web/src/index.css` は中身を空にしてください（2.9 で書きます）。そのうえで `apps/web/src/App.tsx` を全文置き換えます。

```tsx
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  const increment = () => {
    setCount((prev) => prev + 1)
  }

  const reset = () => {
    setCount(0)
  }

  return (
    <div>
      <h1>カウンター</h1>
      <p>現在の値: {count}</p>
      <button onClick={increment}>+1</button>
      <button onClick={reset}>リセット</button>
    </div>
  )
}

export default App
```

`useState(0)` が返すのは `[現在の値, 更新関数]` の2要素の配列で、それを分割代入で `count` と `setCount` に受けています。`setCount` を呼ぶと React がこのコンポーネントをもう一度実行し、新しい `count` で画面を描き直します。

`increment` が `setCount(count + 1)` ではなく `setCount((prev) => prev + 1)` になっているのは、躓きポイントの2つ目に備えた形です。**「今の状態を元に次の状態を決める」ときは、常にこの関数形式で書いておくと安全です。**

## 2.6 タイマー

**何のために**

「時間の経過」という、React の外側で起きる変化をどう扱うかを学びます。ここで `useEffect` と、後片付け (cleanup) の概念が出てきます。

**扱うこと**

- `useEffect` による副作用の記述
- `setInterval` の登録と解除
- 依存配列
- クリーンアップ関数を返さないとどうなるか

**完了条件**

スタートボタンで経過秒数が増え、ストップで止まり、リセットで 0 に戻る。ページを離れてもタイマーが動き続けない。

**躓きポイント**

- **クリーンアップ関数を返し忘れると、`setInterval` が解除されずに残り続けます。** コンポーネントが再描画されるたびに新しいインターバルが増え、カウントが加速します。この現象を実際に体験してもらう構成にします
- 依存配列を空にするか、値を入れるかで挙動が変わります。空配列は「マウント時に一度だけ」を意味します
- React の開発モードでは `useEffect` が意図的に2回実行されます。これはバグを見つけるための機能で、本番ビルドでは1回です

**コード**

2.5 の `App.tsx` を、以下のように書き換えます。

```diff
-import { useState } from 'react'
+import { useEffect, useState } from 'react'

 function App() {
-  const [count, setCount] = useState(0)
+  const [seconds, setSeconds] = useState(0)
+  const [running, setRunning] = useState(false)
```

`useEffect` の部分は初出なので全文で示します。`App` の中、`return` の手前に置きます。

```tsx
useEffect(() => {
  if (!running) return

  const id = setInterval(() => {
    setSeconds((prev) => prev + 1)
  }, 1000)

  return () => {
    clearInterval(id)
  }
}, [running])
```

読み方は3つに分かれます。

| 部分 | 意味 |
|---|---|
| `useEffect(() => { ... })` の中身 | 描画のあとに実行される処理 |
| `return () => { ... }` | **クリーンアップ関数**。次に同じ effect が走る前と、コンポーネントが消えるときに実行される |
| `[running]` | **依存配列**。この配列の中身が変わったときだけ、effect を実行し直す |

`running` が `false` のあいだは何もせずに戻り、`true` になった瞬間に `setInterval` を登録します。`running` が `false` に戻ると、React はまずクリーンアップ関数を呼んでインターバルを解除してから、新しい effect（何もせず戻る）を実行します。

画面部分は以下のようになります。

```tsx
return (
  <div>
    <h1>タイマー</h1>
    <p>{`経過時間: ${seconds} 秒`}</p>
    <button onClick={() => setRunning(true)}>スタート</button>
    <button onClick={() => setRunning(false)}>ストップ</button>
    <button onClick={reset}>リセット</button>
  </div>
)
```

`reset` は `setRunning(false)` と `setSeconds(0)` を続けて呼ぶだけの関数です。

**クリーンアップ関数を消すと何が起きるか、一度試してください。** `return () => { clearInterval(id) }` の行を消してストップ・スタートを何度か押すと、解除されなかったインターバルが積み重なり、秒数が2倍、3倍の速さで進みます。

## 2.7 編集可能なリスト (メモリスト)

**何のために**

配列の状態を扱います。追加・編集・削除という、この先ずっと出てくる操作の基本形です。ここからがアプリの本体になります。

**データ構造**

```ts
type Post = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}
```

**扱うこと**

- 配列を状態として持つ
- `map` によるリスト描画と `key`
- 入力フォームと制御コンポーネント（`value` + `onChange`）
- スプレッド構文による追加、`filter` による削除、`map` による更新

**完了条件**

タイトルと本文を入力してメモを追加でき、各項目を編集でき、削除できる。

**躓きポイント**

- **`key` にインデックスを使わないでください。** 並び替えや削除をしたときに、React が要素を取り違えて表示が壊れます。一意な id を持たせます
- **配列を直接変更してはいけません。** `posts.push(newPost)` は状態の変更として認識されません。`setPosts([...posts, newPost])` のように新しい配列を作ります
- 入力欄に `value` を指定したのに `onChange` を書かないと、文字が入力できなくなります

**id の生成**

`crypto.randomUUID()` を使います。ブラウザに標準で入っている関数で、ライブラリは不要です。

```ts
const newPost: Post = {
  id: crypto.randomUUID(),
  title,
  content,
  createdAt: now,
  updatedAt: now,
}
```

**この関数は「安全なコンテキスト」でのみ使えます。** HTTPS のページと `http://localhost` は安全なコンテキストとして扱われるため、開発サーバーでも本番でも問題ありません。ただし、スマートフォンなどから `http://192.168.x.x:5173` の形でアクセスすると安全なコンテキストにならず、`crypto.randomUUID is not a function` になります。

参考: https://developer.mozilla.org/ja/docs/Web/API/Crypto/randomUUID

なお、この id は 3章以降サーバー側で生成するようになります。ここでの id はブラウザのメモリ上にしか存在しません。

**コード**

`App.tsx` の主要部分です。状態は3つ（メモの配列、入力中のタイトル、入力中の本文）持ちます。

```tsx
const [posts, setPosts] = useState<Post[]>([])
const [title, setTitle] = useState('')
const [content, setContent] = useState('')

const addPost = () => {
  if (title === '' || content === '') return

  const now = Date.now()
  const newPost: Post = {
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: now,
    updatedAt: now,
  }

  setPosts([...posts, newPost])
  setTitle('')
  setContent('')
}

const updatePost = (id: string, values: { title?: string; content?: string }) => {
  setPosts(
    posts.map((post) =>
      post.id === id ? { ...post, ...values, updatedAt: Date.now() } : post,
    ),
  )
}

const deletePost = (id: string) => {
  setPosts(posts.filter((post) => post.id !== id))
}
```

追加・更新・削除が、それぞれスプレッド構文・`map`・`filter` に対応しています。**どれも元の配列を変更せず、新しい配列を作って `setPosts` に渡している**ことを確認してください。

描画側は `map` でリストを作り、各要素に `key` を付けます。

```tsx
<ul>
  {posts.map((post) => (
    <li key={post.id}>
      <input
        value={post.title}
        onChange={(e) => updatePost(post.id, { title: e.target.value })}
      />
      <textarea
        value={post.content}
        onChange={(e) => updatePost(post.id, { content: e.target.value })}
      />
      <button onClick={() => deletePost(post.id)}>削除</button>
    </li>
  ))}
</ul>
```

## 2.8 コンポーネント分離

**何のために**

2.7 の時点では、すべてが1つのファイルに入っています。これを役割ごとに分割し、React の「コンポーネント」という単位で考えられるようにします。

**扱うこと**

- コンポーネントの切り出しと `export` / `import`
- Props によるデータの受け渡し
- Props の型定義
- コールバックを Props として渡す（子から親への通知）
- どこで分割すべきかの判断基準

**完了条件**

見た目と挙動は 2.7 と変わらないまま、`PostList`、`PostItem`、`PostForm` などに分割されている。

**躓きポイント**

- 分割しすぎると、Props をバケツリレーする形になって逆に読みにくくなります。まず動くものを作ってから分割する順番を推奨します
- Props は読み取り専用です。子コンポーネントの中で書き換えても親には反映されません。親の状態を変えたい場合は、親から関数を渡します

## 2.9 CSS 基礎

**何のために**

ここまで見た目には手を付けていません。CSS の基本的な考え方を押さえます。React に固有の話ではなく、Web 全般の話です。

**扱うこと**

- `display` の違い: `block` / `inline` / `inline-block`
- Flexbox（1次元のレイアウト）
- Grid（2次元のレイアウト）
- `position`: `static` / `relative` / `absolute` / `fixed` / `sticky`
- ボックスモデルと `box-sizing`

**完了条件**

メモアプリが、意図した配置で表示されている。

**躓きポイント**

- `inline` 要素には `width` と `height` が効きません。`margin` と `padding` も上下方向は期待通りに効きません。ここが最も引っかかる箇所です
- `position: absolute` の基準は「最も近い `position` が `static` 以外の祖先」です。基準にしたい要素に `position: relative` を付けるのが定石です
- Flexbox の `justify-content` と `align-items` は、`flex-direction` によって向きが入れ替わります

参考: https://developer.mozilla.org/ja/docs/Learn_web_development/Core/CSS_layout

**必要な図**

この節は文章だけでは伝わりにくいため、以下の5点は図を用意します。

| 図 | 示すもの |
|---|---|
| ボックスモデル | content / padding / border / margin の入れ子と、`box-sizing: border-box` で `width` の意味がどう変わるか |
| `display` の違い | `block` / `inline` / `inline-block` の3つを並べ、幅・高さ・改行の挙動を比較する |
| Flexbox の軸 | `flex-direction: row` と `column` で主軸と交差軸が入れ替わること |
| `justify-content` / `align-items` | 上の図と対応させ、どちらがどの軸方向の指定かを示す |
| `position` の基準 | `absolute` が「最も近い `static` 以外の祖先」を基準にすること |

**コード**

`apps/web/src/index.css` に書きます。この記事では CSS Modules などは使わず、クラス名を直接書く方式で進めます。

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
}
```

`box-sizing: border-box` を全要素に指定するのは定番の設定です。既定の `content-box` では `width: 100%` に `padding` と `border` が足された分だけ幅がはみ出します。

## 2.10 React Router でページを分ける

**何のために**

ここまでは1画面のアプリでした。複数のページを持ち、URL で行き来できるようにします。

**構成**

React Router の **Declarative mode**（`<BrowserRouter>` + `<Routes>`）を使います。

| パス | 内容 |
|---|---|
| `/` | メモ一覧・個別ページへのリンク・新規作成ボタン・削除ボタン |
| `/posts/:id` | 個別ページ。編集・更新ボタン・削除ボタン |

**扱うこと**

- `<BrowserRouter>` / `<Routes>` / `<Route>`
- `<Link>` によるページ遷移（`<a>` との違い）
- `useParams` による URL パラメータの取得
- `useNavigate` によるプログラムからの遷移
- 複数ページで状態を共有する方法

**完了条件**

`/` で一覧が表示され、項目をクリックすると `/posts/:id` に遷移して編集できる。ブラウザの戻るボタンが正しく動く。

**躓きポイント**

- `<a href>` を使うとページ全体が再読み込みされ、状態がすべて失われます。`<Link to>` を使ってください
- 状態はメモリ上にあるため、リロードすると消えます。これは 6章でバックエンドに繋ぐまでの一時的な制約です
- **React Router には複数のモードがあります。** 検索して出てくる記事が Framework mode を前提にしていることがあり、`loader` や `action` の話が出てきたらそれは別のモードの話です

参考: https://reactrouter.com/start/declarative/installation

**バージョンとモードの呼称**

執筆時点の最新は **React Router v8** です。公式ドキュメントは v8 の時点でも **Framework / Data / Declarative** の3モードを掲げており、この記事が使う Declarative mode の呼称も API も変わっていません。パッケージ名は `react-router` です（`react-router-dom` は v7 以降不要になりました）。

```bash
npm i -w apps/web react-router
```

**コード**

`main.tsx` でアプリ全体を `<BrowserRouter>` で囲みます。

```tsx
import { BrowserRouter } from 'react-router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

`App.tsx` は、状態を持ったままルートの定義だけを行う形になります。

```tsx
function App() {
  const [posts, setPosts] = useState<Post[]>([])
  // addPost / updatePost / deletePost は 2.7 と同じ

  return (
    <Routes>
      <Route
        path="/"
        element={<PostListPage posts={posts} onAdd={addPost} onDelete={deletePost} />}
      />
      <Route
        path="/posts/:id"
        element={
          <PostDetailPage posts={posts} onUpdate={updatePost} onDelete={deletePost} />
        }
      />
    </Routes>
  )
}
```

**複数ページで状態を共有する方法**が、ここに現れています。`posts` を持っているのは `App` だけで、各ページは Props として受け取ります。状態を持つ場所を、それを使うページより上に置く形です。

個別ページでは、URL の `:id` を `useParams` で受け取り、`posts` から該当するメモを探します。

```tsx
const { id } = useParams()
const navigate = useNavigate()
const post = posts.find((p) => p.id === id)

if (post === undefined) {
  return <p>メモが見つかりませんでした。</p>
}
```

`useParams` の戻り値は `string | undefined` です。**URL は利用者が自由に書き換えられるため、「見つからなかった場合」の分岐は必ず必要になります。** 7.2 で、この分岐が「非公開メモに未ログインでアクセスしたとき」の表示に繋がります。

削除や更新のあとに一覧へ戻るには `useNavigate` を使います。

```tsx
const handleDelete = () => {
  onDelete(post.id)
  navigate('/')
}
```

## 2.11 任意) ESLint / Prettier のセットアップ

**何のために**

ESLint はコードの問題を検出するツール、Prettier は整形するツールです。役割が異なるので併用します。整形に関するルールは Prettier に任せ、ESLint はバグの原因になりうる書き方の検出に集中させます。

**構成**

設定は workspace のルートに1箇所だけ置き、`apps/web` と `apps/api`（3章で作る）の両方を対象にします。フロントとバックでルールがずれる状態を避けるためです。

**テンプレートが入れてくる Lint ツールを外す**

2.2 の `create-vite` は、Lint ツールとして **oxlint**（Rust 製の高速な Lint ツール）の設定 `.oxlintrc.json` を生成します。この記事では ESLint + Prettier で進めるため、まず外します。

```bash
npm uninstall -w apps/web oxlint
rm apps/web/.oxlintrc.json
```

`apps/web/package.json` の `"lint": "oxlint"` も削除してください。

> oxlint や Biome（Lint と整形を1つにまとめたツール）は、ESLint + Prettier より高速で設定も少なく済みます。この記事が ESLint + Prettier を選ぶのは、情報量が圧倒的に多く、詰まったときに調べやすいためです。**この選択は好みの範囲で、後から乗り換えられます。**

**インストール**

ルートで実行します。

```bash
npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals prettier
```

| パッケージ | 役割 |
|---|---|
| `eslint` / `@eslint/js` | ESLint 本体と、その推奨ルール |
| `typescript-eslint` | TypeScript を ESLint で扱うための一式 |
| `eslint-plugin-react-hooks` | フックのルール違反（条件分岐の中で `useState` を呼ぶなど）を検出する |
| `eslint-plugin-react-refresh` | 開発時のホットリロードが壊れる書き方を検出する |
| `globals` | `window` や `document` などのグローバル変数の一覧 |
| `prettier` | 整形 |

**設定ファイル**

ルートに `eslint.config.mjs` を作ります。**拡張子が `.mjs` なのは、ルートの `package.json` に `"type": "module"` を書いていないためです。** `.js` にすると CommonJS として読まれ、`import` 文がエラーになります。

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['**/dist', '**/.wrangler', '**/worker-configuration.d.ts']),

  // フロント・バック共通のルール
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // フロントエンド (apps/web) だけに適用するルール
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
```

React 向けのルールを `apps/web/**` に限定しているのは、`apps/api` に React が無いためです。**`globalIgnores` に入れている `worker-configuration.d.ts` は、3.5 で `wrangler` が自動生成するファイルです。** 生成物を Lint しても直しようがありません。

Prettier の設定はルートの `.prettierrc.json` に書きます。

```json
{
  "semi": false,
  "singleQuote": true
}
```

`.prettierignore` も置きます。

```
dist
.wrangler
package-lock.json
```

ルートの `package.json` にスクリプトを追加します。

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier . --write",
    "format:check": "prettier . --check"
  }
}
```

`format:check` は書き換えずに確認だけを行います。5.2 で CI から実行します。

**`eslint-config-prettier` は必要か**

「ESLint と Prettier の併用には `eslint-config-prettier`（衝突するルールを無効化する設定）が必要」と書かれた記事が多くありますが、**上記の構成では不要です。**

理由は、有効にしているルールセット（`js.configs.recommended`、`typescript-eslint` の recommended、react-hooks、react-refresh）のどれもがフォーマット系のルールを含んでいないためです。ESLint 本体はフォーマット系ルールを非推奨としており、推奨セットからも外れています。衝突するルールが無ければ、無効化する設定も要りません。

Prettier 公式も、`eslint-config-prettier` を「衝突するルールを有効にしている場合に使うもの」として案内しています。あわせて、**`eslint-plugin-prettier`（Prettier を ESLint のルールとして実行する方式）は推奨されていません。** エディタが整形の差分を赤波線で埋め尽くすうえ、Prettier を直接実行するより遅くなるためです。

参考: https://prettier.io/docs/integrating-with-linters

**実プロジェクトではどうなっているか**

参考として `usagicollective/usagi-koyashi`（React + Hono + Cloudflare の実プロジェクト）の設定を見ると、構成はこの記事とほぼ同じで、`eslint-config-prettier` も使っていません。違いは、そこに以下が積み重なっている点です。

- 特定のルールを一時的に `warn` に落とす記述（すぐに直せない指摘を、バージョン更新とは別に扱うため）
- コミット前に自動で Lint と整形をかける仕組み（husky + lint-staged）
- スペルチェック（cspell）、`.editorconfig`

**実プロジェクトの設定をそのままコピーしないでください。** この種の記述はプロジェクト固有の事情で足されたもので、意味を説明できないルールを持ち込むと、警告が出たときに直すべきか無視すべきか判断できなくなります。

**完了条件**

ルートで `npm run lint` と `npm run format` が実行でき、両方ともエラーなく完了する。

**躓きポイント**

- **導入した直後は、既存のコードに大量の警告が出ることがあります。** これは正常です。`npm run lint -- --fix` で自動修正できるものは直ります
- `npm run format` は対象ファイルを**書き換えます**。実行前に変更をコミットしておくと、何が変わったかを `git diff` で確認できます
- VS Code で保存時に自動整形させるには、`.vscode/settings.json` の設定と拡張機能のインストールが必要です

## 2.12 任意) React の仕組み / なぜ SPA なのか

**何のために**

ここまで React を「そういうもの」として使ってきました。裏で何が起きているのかを補います。

**扱うこと**

- 仮想 DOM と差分更新
- 再レンダリングのトリガーは何か
- SPA (Single Page Application) とは何か、従来のサーバーサイドレンダリングとの違い
- SPA の利点と欠点

## 2.13 任意) CSR / SSG / SSR / ISR

**何のために**

このロードマップで作るのは CSR (Client Side Rendering) のアプリです。他にも選択肢があることを知っておきます。

**扱うこと**

- CSR: ブラウザで JavaScript を実行して描画する（今回の構成）
- SSG: ビルド時に HTML を生成しておく
- SSR: リクエストのたびにサーバーで HTML を生成する
- ISR: SSG と SSR の中間。一定時間ごとに再生成する
- それぞれが向いているケース

**注記**

この節は概念の紹介に留めます。今回は Declarative mode を使うため、実際にレンダリング方式を切り替える機会はありません。この選択が何をもたらすかは、7.5 で実際に確認します。

---

# 3 Hono でバックエンドを作る

この章では API だけを作ります。2章で作ったフロントエンドとは、まだ接続しません。

## 3.1 Cloudflare アカウント作成 / `wrangler login`

**何のために**

このロードマップでは、バックエンドを Cloudflare Workers 上で動かし、データベースに Cloudflare D1 を使います。`wrangler` は Cloudflare が提供する CLI で、ローカル開発とデプロイの両方に使います。

**手順**

アカウントを作成します。メールアドレスとパスワードだけで登録でき、確認メールのリンクを踏めば完了です。

https://dash.cloudflare.com/sign-up

次に、CLI からアカウントに接続します。`wrangler` は 3.2 でプロジェクトを作ると一緒に入るので、ここではまだ実行できません。**3.2 を終えてから、リポジトリのルートで以下を実行してください。**

```bash
npx wrangler login
```

ブラウザが開き、アクセスを許可すると認証が完了します。

**完了条件**

`npx wrangler whoami` が自分のアカウント情報を表示する。

**無料枠**

このロードマップで作るものは、いずれも無料枠に収まります。執筆時点の Workers Free プランは以下の通りです。

| 項目 | 無料枠 |
|---|---|
| リクエスト数 | 100,000 / 日 |
| CPU 時間 | 10 ミリ秒 / 呼び出し |
| D1: 読み取り行数 | 500 万行 / 日 |
| D1: 書き込み行数 | 100,000 行 / 日 |
| D1: ストレージ | 合計 5 GB |

参考: https://developers.cloudflare.com/workers/platform/pricing/ / https://developers.cloudflare.com/d1/platform/pricing/

**躓きポイント**

- **ログインが必要になるのは、実際にはもっと後です。** ローカルの開発サーバー（3.3 以降の `wrangler dev`）とローカルの D1（3.6）は、ログインしていなくても動きます。アカウントが要るのは、本番の D1 を作るときと、5章でデプロイするときです。先に済ませておくほうが後で詰まりませんが、急ぎでなければ後回しでも進められます
- WSL からは Windows 側のブラウザが開きます。開かない場合はターミナルに表示される URL を手動でコピーしてください
- 無料枠の範囲ではクレジットカードの登録は不要ですが、有料プランの機能に触れる操作をすると登録を求められます

## 3.2 `npm create hono@latest`

**何のために**

Hono は軽量な Web フレームワークです。Cloudflare Workers 上で動くことを主眼に設計されており、Node.js やその他のランタイムでも動きます。

**手順**

リポジトリのルートで実行し、Cloudflare Workers 向けのテンプレートを選択します。

```bash
npm create hono@latest apps/api -- -t cloudflare-workers -p npm
```

`-t` はテンプレート、`-p` はパッケージマネージャの指定です。テンプレートには `cloudflare-workers` のほか `cloudflare-workers+vite`、`nodejs`、`bun`、`deno`、`aws-lambda`、`vercel` などがあります（`npm create hono@latest -- --help` で一覧できます）。この記事では素の `cloudflare-workers` を使います。

途中で **「Do you want to install project dependencies?」** と聞かれます。**`n` と答えてください。** 依存のインストールは、あとでルートから `npm install` を実行して workspace 全体でまとめて行います。

**生成されるもの**

| ファイル | 中身 |
|---|---|
| `src/index.ts` | `Hello Hono!` を返すだけの最小構成 |
| `package.json` | `hono` と `wrangler`、`dev` / `deploy` / `cf-typegen` スクリプト |
| `wrangler.jsonc` | Worker の設定。`name`、`main`、`compatibility_date` が入り、D1 や KV の設定例がコメントで並んでいる |
| `tsconfig.json` | Workers 向けの TypeScript 設定 |
| `.gitignore` | Node 向けの一般的な内容に `.wrangler` と `.dev.vars` を足したもの |
| `README.md` | 上記スクリプトの使い方 |

生成後、ルートで依存をインストールします。

```bash
npm install
```

**完了条件**

`npm run dev -w apps/api` で開発サーバーが起動し、`http://localhost:8787` にアクセスすると `Hello Hono!` が表示される。

**躓きポイント**

- **生成された `apps/api/package.json` には `"private": true` が入っていません。** 2.1 で説明した理由から、手で追加してください
- 生成された `apps/api/.gitignore` は、ルートの `.gitignore` と内容が重複します。どちらかに寄せて構いませんが、**ルート側の記述は残してください**
- **`npm install` で `install-scripts` の警告が出ることがあります。** npm 12 以降は、インストール時に実行されるスクリプトを既定でブロックします（1.4 のサプライチェーン攻撃への対策の一種です）。`npm install-scripts ls` でブロックされたパッケージを確認できます。この記事の構成では、ブロックされたままでも `wrangler dev` もビルドも動きます

## 3.3 最初のエンドポイント `/health`

**何のために**

サーバーが生きているかを確認するためのエンドポイントです。実運用でも監視や死活監視に使われます。ここでは Hono のルーティングの書き方を覚えるのが目的です。

**扱うこと**

- `app.get()` によるルーティング
- レスポンスの返し方（`c.json()`、`c.text()`）
- ステータスコードの指定

**完了条件**

`/health` にアクセスすると JSON が返る。

**躓きポイント**

- **ルーティングはメソッドチェーンで書いてください。** 6.3 で Hono RPC を使う際、型がハンドラの定義から導出されます。`app.get(...)` と `app.post(...)` を別々の文として書くと型が繋がりません

  ```ts
  // これ
  const app = new Hono()
    .get('/health', ...)
    .get('/posts', ...)

  // ではなく、これは RPC で型が取れない
  const app = new Hono()
  app.get('/health', ...)
  app.get('/posts', ...)
  ```

## 3.4 ブラウザと curl から叩く

**何のために**

API はブラウザで開くだけでは十分に確認できません。POST や PUT、ヘッダーの指定を伴うリクエストを送る手段が必要です。

**扱うこと**

- ブラウザで開けるのは GET だけであること
- `curl` の基本（`-X`、`-H`、`-d`、`-i`、`-v`）
- HTTP のメソッドとステータスコードの意味

**完了条件**

`curl` で `/health` を叩き、ステータスコードとレスポンスボディを確認できる。

## 3.5 環境変数とシークレット

**何のために**

API キーやデータベースの接続情報をコードに直接書くと、リポジトリに公開されてしまいます。環境ごとに値を切り替える仕組みも必要です。

**扱うこと**

- ローカル開発用の `.dev.vars`
- 本番用の `wrangler secret put`
- 「環境変数」と「シークレット」の違い
- Workers では `process.env` ではなく、リクエストのコンテキスト経由で環境変数にアクセスすること
- 型定義の生成

**設定の書き方**

秘密でない値は `wrangler.jsonc` の `vars` に書きます。**このファイルはコミットされるので、秘密の値を書いてはいけません。**

```jsonc
{
  "vars": {
    "CORS_ORIGIN": "http://localhost:5173",
    "BETTER_AUTH_URL": "http://localhost:8787"
  }
}
```

秘密の値は、ローカルでは `apps/api/.dev.vars` に書きます。

```
BETTER_AUTH_SECRET="local-development-secret-do-not-use-in-production"
```

本番には `wrangler secret put` で登録します（5.1 で扱います）。

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

**読み方**

Workers では、環境変数はリクエストのコンテキスト経由で渡されます。Hono では `c.env` です。

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>().get('/health', (c) => {
  return c.json({ status: 'ok', origin: c.env.CORS_ORIGIN })
})
```

**型定義の生成**

`wrangler` が `wrangler.jsonc` と `.dev.vars` を読んで型を生成します。3.2 で生成された `cf-typegen` スクリプトがこれです。

```bash
npm run cf-typegen -w apps/api
```

`apps/api/worker-configuration.d.ts` が作られ、`CloudflareBindings` に以下のような定義が入ります。

```ts
interface __BaseEnv_CloudflareBindings {
  DB: D1Database
  CORS_ORIGIN: "http://localhost:5173"
  BETTER_AUTH_URL: "http://localhost:8787"
  BETTER_AUTH_SECRET: string
}
```

`vars` の値は**リテラル型**（値そのものが型になる）、`.dev.vars` のキーは `string` 型になります。前者は「`wrangler.jsonc` に書いたその値しか入らない」という意味の型なので、本番で別の値を入れる前提のものを厳密に比較するようなコードを書くと、意図しない型エラーになることがあります。

**完了条件**

`.dev.vars` に書いた値が、ローカルで動かした API から読める。

**躓きポイント**

- **`.dev.vars` は絶対にコミットしないでください。** 2.1 で `.gitignore` に追加済みですが、`git status` で確認する習慣を付けてください
- **Cloudflare Workers では `process.env` が使えません。** Node.js の常識が通用しない箇所です
- **`wrangler.jsonc` を変更したら `cf-typegen` を実行し直してください。** 3.6 で D1 のバインディングを足したときに `c.env.DB` が型エラーになりますが、原因はこれです
- 生成された `worker-configuration.d.ts` はコミットして構いません。ただし手で編集しても次の生成で消えます
- 誤ってコミットしてしまった場合、履歴から消しても流出したものとして扱い、値をローテーションしてください

## 3.6 Drizzle + D1 で `posts` テーブルを作る

**何のために**

Drizzle は TypeScript で書ける ORM です。スキーマを TypeScript のコードとして定義し、そこからマイグレーションと型を生成します。D1 は Cloudflare が提供する SQLite ベースのデータベースです。

**テーブル定義**

`posts` テーブル

| カラム | 型 | 必須 | 備考 |
|---|---|---|---|
| `id` | text | ○ | 主キー |
| `user_id` | text | ○ | 外部キー（3.10 で追加） |
| `title` | text | ○ | |
| `content` | text | ○ | 本文 |
| `is_public` | integer (boolean) | ○ | **既定値 false** |
| `created_at` | integer | ○ | |
| `updated_at` | integer | ○ | |

`is_public` が true のメモは、ログインしていないユーザーからも閲覧できます。**既定値を false にしているのは、公開が明示的な操作でなければならないためです。** 既定で公開になっていると、意図しない情報が漏れます。

**扱うこと**

- Drizzle のスキーマ定義
- D1 データベースの作成とバインディング
- マイグレーションの生成と適用
- ローカル D1 と本番 D1 の違い
- Drizzle Studio でのデータ確認

**インストール**

```bash
npm i -w apps/api drizzle-orm
npm i -D -w apps/api drizzle-kit
```

> 公式ドキュメントの一部は `drizzle-orm@rc`（v1 系のリリース候補）を案内していますが、この記事では安定版を使います。学習中に RC 特有の問題を踏むのは避けたいためです。

**データベースを作る**

```bash
npx wrangler d1 create memo-app-db
```

作成すると、`wrangler.jsonc` に貼り付けるための設定が出力されます。`database_id` は自分のものに置き換えてください。`migrations_dir` は自分で足します。

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "memo-app-db",
      "database_id": "<出力された ID>",
      "migrations_dir": "drizzle"
    }
  ]
}
```

`binding` の `DB` が、コードから `c.env.DB` として見える名前です。**変更したら 3.5 の `cf-typegen` を実行し直してください。**

> ローカルだけで進める場合、`wrangler d1 create`（＝ Cloudflare のアカウント）は必須ではありません。`database_id` に仮の文字列を入れておけば、ローカルの D1 は動きます。本番にデプロイする 5章までには作っておいてください。

**スキーマ定義**

`apps/api/src/db/schema.ts` を作ります。

```ts
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})
```

**TypeScript 側はキャメルケース、データベース側はスネークケース**という対応になっています。`text('user_id')` の引数が実際の列名です。

`{ mode: 'boolean' }` と `{ mode: 'timestamp_ms' }` が、SQLite の integer をどう解釈するかの指定です。前者は 0 / 1 を `boolean` として、後者はミリ秒のタイムスタンプを `Date` として扱います。`user_id` の外部キー制約は、ユーザーのテーブルができる 3.10 で足します。

**マイグレーションの生成と適用**

`apps/api/drizzle.config.ts` を作ります。

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
```

スキーマから SQL を生成します。`apps/api` で実行してください。

```bash
npx drizzle-kit generate --name init_posts
```

`drizzle/0000_init_posts.sql` が生成されます。**`--name` を付けないと `0000_fixed_the_stranger.sql` のようなランダムな名前になります。** 後から履歴を追うときに困るので、付ける習慣を付けてください。

生成された SQL をローカルの D1 に適用します。

```bash
npx wrangler d1 migrations apply DB --local
```

本番に適用するときは `--local` を `--remote` に変えます（5章）。

**確認**

```bash
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

`posts` が含まれていれば成功です。

**任意) Drizzle Studio**

ブラウザでテーブルの中身を見られるツールです。ローカルの D1 に繋ぐには、SQLite ドライバと、ファイルの場所を指した設定が要ります。

```bash
npm i -D -w apps/api @libsql/client
```

`apps/api/drizzle-studio.config.ts` を作ります。ローカル D1 のファイル名はハッシュなので、実行時に探す形にしています。

```ts
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'drizzle-kit'

const stateDir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
const file = readdirSync(stateDir).find(
  (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
)

export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './drizzle',
  dbCredentials: { url: join(stateDir, file!) },
})
```

`npx drizzle-kit studio --config drizzle-studio.config.ts` で起動します。

**完了条件**

ローカルの D1 に `posts` テーブルが作られ、`wrangler d1 execute` で確認できる。

**躓きポイント**

- **SQLite には boolean 型がありません。** `is_public` は integer の 0 / 1 として保存されます。上記の `{ mode: 'boolean' }` がその変換を担当します
- **`Date` は JSON になるとき ISO 文字列になります。** API のレスポンスでは `"2026-08-20T12:02:29.498Z"` の形で返ります。6.3 で型を共有すると、フロント側の型も `string` になります
- ローカルの D1 は本番とは別物です。ローカルで入れたデータは本番には反映されません
- **SQLite では、後から外部キー制約を足すとテーブルの作り直しになります。** 3.10 で `posts.user_id` に制約を足しますが、そのとき既存の行が制約を満たしていないと `FOREIGN KEY constraint failed` でマイグレーションが失敗します。開発中であれば `rm -rf apps/api/.wrangler/state/v3/d1` でローカルのデータベースを消してから適用し直すのが手早いです
- **D1 はインタラクティブなトランザクションに対応していません。** 複数の書き込みをまとめたい場合はバッチ処理の API を使います

## 3.7 入力バリデーション

**何のために**

クライアントから送られてくるデータが期待した形とは限りません。不正なデータをそのままデータベースに入れると、後続の処理が壊れます。

また、6.3 で Hono RPC を使う際、**バリデータを通していないとリクエストの型がクライアント側に伝わりません。** RPC の恩恵を受けるためにも必要な工程です。

**扱うこと**

- zod によるスキーマ定義
- Hono のバリデータミドルウェア
- バリデーションエラー時のレスポンス設計
- 「サーバー側のバリデーションは必須」であること（クライアント側のチェックは UX のためのもので、セキュリティ上の防御にはならない）

**インストール**

```bash
npm i -w apps/api zod @hono/zod-validator
```

`@hono/zod-validator` が、Hono と zod をつなぐミドルウェアです。**zod 3 系と 4 系のどちらでも動きます**（このバージョンの `peerDependencies` は `^3.25.0 || ^4.0.0`）。この記事では 4 系を使います。

**使い方**

スキーマを定義し、`zValidator` をハンドラの手前に挟みます。

```ts
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const postInput = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  isPublic: z.boolean().optional(),
})

const app = new Hono().post('/posts', zValidator('json', postInput), async (c) => {
  const input = c.req.valid('json')
  // input は { title: string; content: string; isPublic?: boolean } として型が付く
})
```

`zValidator` の第1引数は検証する場所です。`'json'` のほか `'query'`、`'param'`、`'header'`、`'form'` を指定できます。

**`c.req.valid('json')` が、この節のもう一つの目的です。** 検証を通った値が、スキーマから導かれた型付きで取り出せます。`c.req.json()` を直接呼ぶと `any` 相当のままです。

**エラーの形**

検証に失敗すると、既定では 400 と以下のような JSON が返ります。

```json
{
  "success": false,
  "error": {
    "name": "ZodError",
    "message": "[{\"code\":\"too_small\",\"path\":[\"title\"],\"message\":\"Too small: expected string to have >=1 characters\"}]"
  }
}
```

`message` が文字列化された JSON になっている点に注意してください。読みやすい形で返したい場合は、`zValidator` の第3引数にハンドラを渡して自分で整形します。この記事では既定のまま進めます。

**完了条件**

不正な形式のリクエストを送ると、400 とエラー内容が返る。

```bash
curl -X POST http://localhost:8787/posts -H 'Content-Type: application/json' -d '{"title":"","content":"x"}'
```

## 3.8 `posts` の CRUD エンドポイント

**何のために**

作成・取得・更新・削除の一通りを実装します。

**エンドポイント**

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/posts` | 必須 | 自分のメモ一覧（公開・非公開の両方） |
| POST | `/posts` | 必須 | 作成（`is_public` の既定は false） |
| GET | `/posts/:id` | 任意 | 所有者なら常に取得可。それ以外は `is_public` が true のときのみ |
| PUT | `/posts/:id` | 必須 | 所有者のみ |
| DELETE | `/posts/:id` | 必須 | 所有者のみ |

この節では認証をまだ実装していないため、**まず認証なしで全件を返す形で実装し、3.10 で認証と認可を被せます。**

**扱うこと**

- Drizzle によるクエリの書き方
- 存在しない id を指定されたときの 404
- ステータスコードの選び方（201、204 など）
- エラーハンドリングの共通化

**完了条件**

`curl` で5つのエンドポイントすべてを叩き、期待通りに動作する。

**躓きポイント**

- ルーティングの定義順に注意してください。パラメータを含むパスは、固定のパスより後に定義します
- 更新時に `updated_at` を更新し忘れがちです

## 3.9 認証・認可の基礎

**何のために**

実装の前に概念を整理します。ここを曖昧にしたまま実装すると、何を作っているのか分からなくなります。

**扱うこと**

- **認証 (Authentication)**: 誰であるかを確かめること
- **認可 (Authorization)**: 何をしてよいかを決めること
- セッションベースとトークンベースの違い
- Cookie と `Authorization` ヘッダー
- パスワードをハッシュ化して保存する理由
- なぜ認証を自前で実装すべきでないのか

**このアプリの認可ルール**

```
閲覧できる条件: 所有者である || is_public が true
編集・削除できる条件: 所有者である
```

条件が2つ以上の論理式になった時点で、認可はテストすべき対象になります。4.2 と 8章で実際に検証します。

## 3.10 Better Auth を導入し、`posts` をユーザーに紐づける

**何のために**

Better Auth は TypeScript 向けの認証ライブラリです。ユーザー登録、ログイン、セッション管理を提供します。

**構成**

- データベースアダプタ: **Drizzle アダプタ**（3.6 で使った Drizzle のスキーマと統一するため）
- 認証方式: **bearer トークン**（6章でクロスオリジンの API 呼び出しを行うため）
- `posts` テーブルに `user_id` を追加し、ユーザーに紐づける

> **Better Auth は 1.5 から Cloudflare D1 を組み込みでサポートしています。** `database: env.DB` と書くだけで済み、アダプタの設定は要りません。それでもこの記事が Drizzle アダプタを選ぶのは、(1) マイグレーションを drizzle-kit の一本に統一できる、(2) 3.11 でユーザーのテーブルと `posts` を join するため、どのみち Drizzle 側にユーザーのテーブル定義が必要になる、の2点からです。**Drizzle を使わない構成なら、組み込みの D1 サポートのほうが簡単です。**

**ユーザーの識別子**

Better Auth が生成する内部 ID とは別に、URL で使う識別子を持たせます。

| 項目 | 仕様 |
|---|---|
| ユーザー ID | サインアップ時に**入力させる**。**変更不可** |
| 形式 | 英数字とハイフンのみ、長さ制限あり |
| 予約語 | `public`、`posts`、`users`、`api`、`health` などを除外 |
| 表示名 `name` | 別カラムとして持つ。変更可能。日本語も可 |

**変更不可にする理由**は、7.4 で `/users/:userId` という URL を公開するためです。変更できると、共有された URL が壊れます。

**予約語の除外は忘れやすい箇所です。** ユーザー ID に `public` を取られると紛らわしい URL が生まれますし、将来 `/:userId` 形式のパスに変更したくなったときにも効いてきます。

**2種類の認証ミドルウェア**

| 種類 | 用途 | 挙動 |
|---|---|---|
| 必須 | `/posts`、`PUT`、`DELETE` など | トークンが無ければ 401 |
| 任意 | `GET /posts/:id` | トークンがあれば誰か分かる。無くても通す |

「任意」が必要なのは、公開メモを未ログインでも閲覧できるようにするためです。ログインしていれば「所有者かどうか」の判定ができ、していなければ `is_public` だけで判定します。

**扱うこと**

- Better Auth のセットアップ
- 認証用テーブルのマイグレーション
- ユーザー ID のバリデーションと重複チェック
- サインアップ・ログインのエンドポイント
- 認証ミドルウェア（必須・任意の2種類）
- `posts` の各エンドポイントに認可を適用する

**完了条件**

- サインアップとログインができ、トークンが取得できる
- トークンなしで `GET /posts` にアクセスすると 401 が返る
- 他人の非公開メモは取得も更新も削除もできない
- 他人の公開メモは、未ログインでも `GET /posts/:id` で取得できる

**躓きポイント**

- **他人の非公開メモにアクセスされたときは、403 ではなく 404 を返してください。** 403 は「そこに何かが存在するが権限がない」という情報を漏らします。id を総当たりされたときに、存在する id を特定されます
- **Cloudflare Workers では、D1 のバインディングがリクエストのコンテキスト経由でしか取れません。** そのため Better Auth のインスタンスをモジュールのトップレベルで作ることができず、リクエストごとに生成する形になります。この点は Node.js 向けのサンプルコードと構成が異なります
- 認可の実装漏れは、動作確認では気づきにくい種類のバグです。「他人のデータが取れないこと」を明示的に確認してください
- **`drizzleAdapter` には `schema` を渡してください。** 渡さないと、サインアップ時に `The model "user" was not found in the schema object` というエラーで 500 になります
- **Better Auth の CLI は、`auth` という名前（またはデフォルト）で export されたインスタンスを探します。** `createAuth` のような関数だけを export していると `Couldn't read your auth config` で止まります。上のコードで CLI 用のインスタンスを別に置いているのはこのためです
- `BETTER_AUTH_URL`（`baseURL`）を設定しないと、起動のたびに警告が出ます。リダイレクトやコールバックの URL がリクエスト由来になるためで、本番では必ず設定してください
- **ユーザーのテーブルには `user_id` という列が2つの意味で現れます。** `user.user_id` はこの記事で足した「URL に出るユーザー ID」、`session.user_id` は「`user.id` への外部キー」です。紛らわしいので、コードを読むときは注意してください

**インストール**

```bash
npm i -w apps/api better-auth
```

**設定を書く**

`apps/api/src/auth.ts` を作ります。要点は3つです。

1. 設定（`options`）と、インスタンスを作る関数（`createAuth`）を分ける
2. `createAuth` は `env` を受け取る。**D1 のバインディングはリクエストのコンテキスト経由でしか取れないため、トップレベルでインスタンスを作れません**
3. スキーマ生成の CLI 用に、`auth` という名前のインスタンスも export する

```ts
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import * as schema from './db/auth-schema'

// URL に出るユーザー ID。予約語は将来のパス追加とぶつかるため除外する
const RESERVED_USER_IDS = ['auth', 'api', 'health', 'posts', 'public', 'users']

export const userIdSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9-]+$/, '英小文字・数字・ハイフンのみ使えます')
  .refine((value) => !RESERVED_USER_IDS.includes(value), '予約語は使えません')

const options = {
  basePath: '/auth',
  emailAndPassword: { enabled: true },
  plugins: [bearer()],
  user: {
    additionalFields: {
      userId: { type: 'string', required: true, input: true, unique: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user: Record<string, unknown>) => {
          const result = userIdSchema.safeParse(user.userId)
          if (!result.success) {
            throw new APIError('BAD_REQUEST', {
              message: result.error.issues[0].message,
            })
          }
        },
      },
    },
  },
} satisfies BetterAuthOptions

export const createAuth = (env: CloudflareBindings) =>
  betterAuth({
    ...options,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: 'sqlite',
      schema,
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
  })

// Better Auth CLI がスキーマ生成のために読み込む定義。リクエスト処理には使いません
export const auth = betterAuth({
  ...options,
  database: drizzleAdapter(drizzle({} as D1Database, { schema }), {
    provider: 'sqlite',
    schema,
  }),
})
```

`user.additionalFields` が、ユーザーのテーブルに独自カラムを足す指定です。`input: true` でサインアップ時に受け取れるようになり、`unique: true` で一意制約が付きます。**表示名 `name` は Better Auth が最初から持っているので、追加は不要です。**

ユーザー ID の検証は `databaseHooks.user.create.before` で行います。ここで `APIError` を投げると、サインアップが 400 で止まります。

**テーブルを作る**

Better Auth の CLI で、Drizzle のスキーマを生成します。

```bash
cd apps/api
npx auth@latest generate --output src/db/auth-schema.ts -y
```

`user` / `session` / `account` / `verification` の4テーブルが生成されます。**このファイルは生成物なので、手で編集しないでください。** カラムを足したいときは `auth.ts` の `additionalFields` を書き換えて生成し直します。

生成したスキーマを drizzle-kit に認識させます。`drizzle.config.ts` の `schema` を配列にしてください。

```ts
schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
```

`posts` から `user` への外部キーも張ります。

```ts
import { user } from './auth-schema'

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // 以下は 3.6 と同じ
})
```

マイグレーションを生成して適用します。

```bash
npx drizzle-kit generate --name add_auth_tables
npx wrangler d1 migrations apply DB --local
```

**エンドポイントを生やす**

Hono に Better Auth のハンドラを繋ぎます。`basePath` に合わせたパスに、GET と POST をまとめて流します。

```ts
const app = new Hono<Env>().on(['GET', 'POST'], '/auth/*', (c) =>
  createAuth(c.env).handler(c.req.raw),
)
```

これだけで、サインアップ・ログイン・ログアウトなどのエンドポイントが生えます。

```bash
# サインアップ
curl -i -X POST http://localhost:8787/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@example.com","password":"password1234","name":"あきら","userId":"akira"}'

# ログイン
curl -i -X POST http://localhost:8787/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@example.com","password":"password1234"}'
```

**トークンは、レスポンスの `set-auth-token` ヘッダーに入って返ってきます。**

```
access-control-expose-headers: set-auth-token
set-auth-token: g9wZeE98ovAkM2LSq7lkfJ9mfBmAPF6K.E2VrIGBZVz0zYtYsAGwlQRzud00ZsZFBVcIbSr9DelQ=
```

これを `Authorization: Bearer <トークン>` として送ると、リクエストの持ち主が分かるようになります。`access-control-expose-headers` が一緒に付いているのは、クロスオリジンではブラウザの JavaScript から読めるヘッダーが制限されるためです（6.1 で扱います）。

**認証ミドルウェア**

セッションは `auth.api.getSession()` にリクエストのヘッダーを渡して取得します。

```ts
const getUser = async (c: { env: CloudflareBindings; req: { raw: Request } }) => {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (session === null) return null

  const { id, name, userId } = session.user as AuthUser
  return { id, name, userId }
}

// 認証必須。トークンが無ければ 401
const requireAuth = createMiddleware<Env>(async (c, next) => {
  const authUser = await getUser(c)
  if (authUser === null) {
    return c.json({ message: 'Unauthorized' }, 401)
  }
  c.set('user', authUser)
  await next()
})

// 任意認証。トークンがあれば誰か分かる。無くても通す
const optionalAuth = createMiddleware<Env>(async (c, next) => {
  c.set('user', await getUser(c))
  await next()
})
```

`Env` は Hono の型引数で、`Bindings`（`c.env` の型）と `Variables`（`c.set` / `c.get` の型）を持ちます。

```ts
type AuthUser = { id: string; userId: string; name: string }
type Env = {
  Bindings: CloudflareBindings
  Variables: { user: AuthUser | null }
}
```

**認可を適用する**

3.8 で書いた `posts` のエンドポイントに、ミドルウェアと所有者の条件を足します。

```ts
.get('/posts', requireAuth, async (c) => {
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, c.get('user')!.id))   // 自分のものだけ
    .all()
  return c.json(rows)
})

.put('/posts/:id', requireAuth, zValidator('json', postInput), async (c) => {
  const updated = await db
    .update(posts)
    .set({ ...c.req.valid('json'), updatedAt: new Date() })
    .where(
      and(eq(posts.id, c.req.param('id')), eq(posts.userId, c.get('user')!.id)),
    )
    .returning()
    .get()

  if (updated === undefined) {
    return c.json({ message: 'Not Found' }, 404)   // 他人のメモもここに落ちる
  }
  return c.json(updated)
})
```

**「所有者かどうか」を `where` の条件に混ぜているのがポイントです。** 他人のメモを更新しようとすると該当行が0件になり、そのまま 404 になります。「取得してから所有者を比較して 403 を返す」という書き方をしないので、**403 と 404 を書き分けるミスがそもそも起きません。**

閲覧だけは条件が違います（所有者 || 公開）。

```ts
.get('/posts/:id', optionalAuth, async (c) => {
  const row = await db.select().from(posts).where(eq(posts.id, c.req.param('id'))).get()

  const authUser = c.get('user')
  if (row === undefined || (row.userId !== authUser?.id && row.isPublic === false)) {
    return c.json({ message: 'Not Found' }, 404)
  }
  return c.json(row)
})
```

## 3.11 公開用のエンドポイント

**何のために**

7章で作る公開ページのための API です。いずれも認証は不要です。

**エンドポイント**

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/public/posts` | 全体公開されているメモの一覧 |
| GET | `/users/:userId/posts` | そのユーザーが公開しているメモの一覧 |

**扱うこと**

- `is_public` が true のものだけを返すクエリ
- `posts` とユーザーテーブルの join（投稿者の表示名を返すため）
- 存在しない `userId` を指定されたときの 404
- ページネーション（またはその必要性の説明）

**完了条件**

- 認証なしで `/public/posts` を叩くと、公開メモだけが投稿者名付きで返る
- 非公開メモが1件も含まれていない

**躓きポイント**

- **join したときに、ユーザーテーブルの余計な情報（メールアドレス、パスワードハッシュなど）を返さないよう注意してください。** 必要なカラムだけを明示的に選択します。これは実際に起きやすい情報漏洩の形です
- 公開一覧は誰でも叩けるため、件数を制限しないと負荷の原因になります

---

# 4 テストを書く

## 4.1 フロントエンドのテスト

**何のために**

手動での動作確認は、機能が増えるほど時間がかかり、確認漏れも起きます。自動化します。

**使うもの**

- Vitest（テストランナー）
- Testing Library（React コンポーネントのテスト）

**テスト対象**

2章で作ったメモアプリのコンポーネント。

- 一覧が表示される
- 追加ボタンで項目が増える
- 削除ボタンで項目が減る
- タイトルまたは本文が空のときは追加できない

**扱うこと**

- Vitest のセットアップ
- Testing Library の基本（`render`、`screen`、`userEvent`）
- 「実装の詳細ではなく、ユーザーから見た振る舞いをテストする」という考え方
- 何をテストして、何をテストしないか

**躓きポイント**

- テストしすぎると、リファクタリングのたびにテストが壊れて負担になります。「表示が変わったら壊れるテスト」ではなく「振る舞いが変わったら壊れるテスト」を目指します
- `getBy` と `queryBy` と `findBy` の使い分けが分かりにくい箇所です

**セットアップ**

```bash
npm i -D -w apps/web vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom
```

Vitest の設定は、Vite の設定ファイルに相乗りできます。`apps/web/vite.config.ts` を書き換えます。

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Testing Library の自動クリーンアップ（各テスト後の unmount）は
    // グローバルの afterEach に登録されるため、globals が必要
    globals: true,
    setupFiles: './src/setup-tests.ts',
  },
})
```

**`defineConfig` の import 元が `vite` ではなく `vitest/config` になる点に注意してください。** `test` の設定はこちらにしかありません。

`apps/web/src/setup-tests.ts` は1行です。

```ts
import '@testing-library/jest-dom/vitest'
```

`toBeInTheDocument()` のような、DOM 向けのアサーションが使えるようになります。

`apps/web/package.json` にスクリプトを足します。

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**テストを書く**

`apps/web/src/App.test.tsx` を作ります。`App` はルーティングを含むので、`MemoryRouter`（履歴をメモリ上に持つ Router）で囲みます。

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'

const renderApp = () =>
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

describe('メモ一覧', () => {
  it('追加すると一覧に増える', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByPlaceholderText('タイトル'), '買い物')
    await user.type(screen.getByPlaceholderText('本文'), 'たまごを買う')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(screen.getByRole('link', { name: '買い物' })).toBeInTheDocument()
  })

  it('タイトルか本文が空のときは追加できない', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByPlaceholderText('タイトル'), 'タイトルだけ')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(screen.getByText('まだメモがありません。')).toBeInTheDocument()
  })
})
```

**`getByRole('button', { name: '追加' })` のように、画面に見えている情報で要素を探しているのがポイントです。** クラス名や `data-testid` ではなく、利用者が見て操作するのと同じ手がかりを使います。こうしておくと、内部構造を変えてもテストは壊れません。

**完了条件**

`npm test -w apps/web` が通る。

**追加の躓きポイント**

- **`globals: true` を外すと、テスト間で描画が残ります。** Testing Library の自動クリーンアップがグローバルの `afterEach` に依存しているためで、外すと「同じ placeholder の要素が複数見つかった」というエラーになります

## 4.2 バックエンドのテスト

**何のために**

API のテストです。Cloudflare Workers の実行環境は Node.js とは異なるため、専用のテスト環境を使います。

**使うもの**

- Vitest
- `@cloudflare/vitest-pool-workers`（Workers のランタイム上でテストを実行する）

**テスト対象**

3章で作ったエンドポイントと認可。

| 分類 | ケース |
|---|---|
| 基本 | `/health` が 200 を返す |
| CRUD | メモの作成・取得・更新・削除 |
| バリデーション | 不正な形式で 400 が返る。ユーザー ID の予約語が弾かれる |
| 認証 | トークンなしで `GET /posts` が 401 を返す |
| 認可 | 他人の非公開メモが 404 になる（403 ではない） |
| 認可 | 他人の公開メモが未ログインで取得できる |
| 認可 | 他人のメモは公開・非公開を問わず更新・削除できない |
| 公開一覧 | `/public/posts` に非公開メモが含まれない |
| 公開一覧 | `/public/posts` のレスポンスにメールアドレスなどが含まれない |

**認可のテストがこの節の中心です。** CRUD が動くことは手動でも確認できますが、「見えてはいけないものが見えない」ことは、意識してテストを書かないと確認されません。

**扱うこと**

- `vitest-pool-workers` のセットアップ
- テスト用の D1 の準備とリセット
- 複数ユーザーを用意してテストする方法

**躓きポイント**

- **通常の Vitest ではなく `vitest-pool-workers` を使う理由は、Workers のランタイムが Node.js と異なるためです。** D1 のバインディングや `cloudflare:workers` からの import は、通常の Node.js 環境では動きません
- テスト間でデータが残ると、実行順によって結果が変わるテストになります

**セットアップ**

```bash
npm i -D -w apps/api vitest @cloudflare/vitest-pool-workers
```

`apps/api/vitest.config.ts` を作ります。

```ts
import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// drizzle-kit が生成した SQL を読み、テスト用の D1 に適用できるようにする
const migrations = await readD1Migrations(path.join(import.meta.dirname, 'drizzle'))

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          BETTER_AUTH_SECRET: 'test-secret',
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./test/apply-migrations.ts'],
  },
})
```

`wrangler.jsonc` を読ませているので、D1 のバインディングや `vars` はそのまま使えます。`.dev.vars` も自動で読み込まれますが、**CI には `.dev.vars` が無い**ため、`BETTER_AUTH_SECRET` はテスト用の値をここでも渡しています。

`apps/api/test/apply-migrations.ts`:

```ts
import { applyD1Migrations, env } from 'cloudflare:test'

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

`apps/api/test/env.d.ts` で、テスト側から見える環境の型を宣言します。`cloudflare:test` の `env` は `Cloudflare.Env` 型なので、そこに足す形になります。

```ts
import type { D1Migration } from '@cloudflare/vitest-pool-workers'

// vitest.config.ts の miniflare.bindings で足したものを、テストから型付きで参照する
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}
```

`cloudflare:test` からの import を TypeScript に解決させるため、`apps/api/tsconfig.json` に型定義を足します。

```jsonc
{
  "compilerOptions": {
    "types": ["@cloudflare/vitest-pool-workers/types"]
  }
}
```

**これを忘れると、テストは動くのに `tsc --noEmit` だけが `Module 'cloudflare:test' has no exported member 'SELF'` で落ちます。**

**テストを書く**

`SELF.fetch()` で、実際に Worker にリクエストを送れます。

```ts
import { SELF, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

// Better Auth は baseURL と一致しないオリジンからのリクエストを拒否する（422）ため、
// wrangler.jsonc の BETTER_AUTH_URL と同じオリジンで叩く
const BASE = 'http://localhost:8787'

// テスト間でデータが残ると、実行順で結果が変わるテストになる。
// D1 にはインタラクティブなトランザクションが無いので batch() でまとめて消す
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM posts'),
    env.DB.prepare('DELETE FROM session'),
    env.DB.prepare('DELETE FROM account'),
    env.DB.prepare('DELETE FROM verification'),
    env.DB.prepare('DELETE FROM user'),
  ])

  alice = await signUp('alice')
  bob = await signUp('bob')
})
```

複数ユーザーは、サインアップのエンドポイントを叩くヘルパーで用意します。トークンは 3.10 で確認した `set-auth-token` ヘッダーから取り出します。

```ts
const signUp = async (userId: string) => {
  const res = await SELF.fetch(`${BASE}/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `${userId}@example.com`,
      password: 'password1234',
      name: `${userId} の表示名`,
      userId,
    }),
  })
  expect(res.status).toBe(200)
  return { token: res.headers.get('set-auth-token')!, userId }
}
```

認可のテストは、この節の中心です。

```ts
it('他人の非公開メモは 404（403 ではない）', async () => {
  const post = await createPost(alice, false)

  const res = await SELF.fetch(`${BASE}/posts/${post.id}`, {
    headers: { Authorization: `Bearer ${bob.token}` },
  })
  expect(res.status).toBe(404)
})

it('レスポンスにメールアドレスが含まれない', async () => {
  await createPost(alice, true)

  const res = await SELF.fetch(`${BASE}/public/posts`)
  expect(await res.text()).not.toContain('@example.com')
})
```

後者は、**レスポンス全体を文字列として見て、含まれてはいけないものが無いことを確認する**書き方です。カラムを1つ追加したときに漏れを検出できます。

**完了条件**

`npm test -w apps/api` が通る。

**追加の躓きポイント**

- **テスト間でストレージは自動ではリセットされません。** 上記のように明示的に消してください。消し忘れると、2つ目以降のテストでサインアップが `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`（422）になります
- **リクエストのオリジンは `BETTER_AUTH_URL` と揃えてください。** `https://example.com` のような別オリジンから叩くと、Better Auth が 422 を返します

---

# 5 デプロイする

**注記**: この時点ではフロントとバックエンドはまだ接続されていません。まず動く状態のものをデプロイし、6章で接続したあとに再度デプロイします。早い段階で一度デプロイしておくことで、以降の変更が自動で反映される体験が得られます。

## 5.1 環境変数・シークレットの置き場所を決める

**何のために**

ローカル、CI、本番の3箇所で、同じ設定をどこにどう置くかを整理します。

**扱うこと**

| 場所 | 環境変数 | シークレット |
|---|---|---|
| ローカル | `.dev.vars` | `.dev.vars` |
| CI (GitHub Actions) | workflow の `env` | GitHub Secrets |
| 本番 (Cloudflare) | `wrangler.jsonc` の `vars` | `wrangler secret put` |

- Cloudflare API トークンの発行と、必要な権限の絞り込み
- GitHub Secrets への登録

**躓きポイント**

- **Cloudflare API トークンには必要最小限の権限だけを与えてください。** 全権限のトークンを GitHub に置くのは避けます
- フロントエンドのビルド時に埋め込まれる環境変数（`VITE_` 接頭辞のもの）は、**ビルド成果物に平文で含まれます。** シークレットを入れてはいけません。この点は 6.6 でも再度触れます

## 5.2 GitHub Actions を構築する

**何のために**

`git push` したら自動でテストが走り、`main` にマージされたら自動でデプロイされる状態を作ります。

**構成**

- フロントエンド (`apps/web`) とバックエンド (`apps/api`) を別々の Worker としてデプロイする
- `paths` フィルタで、変更があった側だけをデプロイする
- Pull Request ではテストのみ、`main` へのマージでデプロイ

**扱うこと**

- workflow ファイルの構成
- `actions/setup-node` と `node-version-file: .nvmrc`
- npm workspaces 環境での `npm ci`
- Cloudflare へのデプロイ
- CI 環境での safe-chain の設定（`--ci` フラグ）

**完了条件**

`main` に push すると自動でデプロイされ、公開された URL で `/health` にアクセスできる。

**躓きポイント**

- `npm ci` はロックファイルと `package.json` が一致していないと失敗します。ローカルで `npm install` した結果のロックファイルを必ずコミットしてください
- `paths` フィルタを使う場合、共通ファイル（ルートの `package.json`、ロックファイル）の変更時にどちらも動くよう設定が必要です

**フロントエンドも Worker としてデプロイする**

`apps/web` はビルドすると静的ファイルの集まりになります。これを配信する Worker の設定を `apps/web/wrangler.jsonc` に置きます。

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "memo-app-web",
  "compatibility_date": "2026-08-20",
  "assets": {
    "directory": "./dist",
    // SPA なので、どのパスに来ても index.html を返す
    "not_found_handling": "single-page-application"
  }
}
```

**`not_found_handling` の指定は必須です。** これが無いと、`/posts/xxx` を直接開いたときに 404 になります。SPA ではルーティングをブラウザ側の JavaScript が担当するため、サーバーはどのパスでも同じ `index.html` を返す必要があります。

`apps/web` にも `wrangler` を入れ、`deploy` スクリプトを足してください。

```bash
npm i -D -w apps/web wrangler
```

**ワークフローの構成**

3つのファイルに分けます。デプロイを別ファイルにするのは、`paths` フィルタがワークフロー単位でしか書けないためです。

| ファイル | 起動条件 | 内容 |
|---|---|---|
| `.github/workflows/ci.yml` | PR と `main` への push | Lint、整形チェック、型チェック、単体テスト、E2E |
| `.github/workflows/deploy-api.yml` | `main` への push（`apps/api/**` が変わったとき） | D1 のマイグレーション適用 → デプロイ |
| `.github/workflows/deploy-web.yml` | `main` への push（`apps/web/**` が変わったとき） | ビルド → デプロイ |

`ci.yml` の要点です。

```yaml
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc   # ローカルと同じバージョンを使う
          cache: npm

      # 1.4 で入れた safe-chain を CI でも効かせる（--ci でシムを PATH に置く）
      - name: Install safe-chain
        run: |
          curl -fsSL https://github.com/AikidoSec/safe-chain/releases/download/1.5.15/install-safe-chain.sh -o /tmp/install-safe-chain.sh
          echo "de0565e3d6346407a604e84e639e95fea8758748063da2216bbfdca5feda5dd2  /tmp/install-safe-chain.sh" | sha256sum -c -
          sh /tmp/install-safe-chain.sh --ci
          rm /tmp/install-safe-chain.sh

      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck -w apps/web
      - run: npm run typecheck -w apps/api
      - run: npm test -w apps/web
      - run: npm test -w apps/api
```

**`node-version-file: .nvmrc` で、2.1 で作ったファイルを CI でも使い回しています。** バージョンの指定場所が1つで済みます。

safe-chain のインストールスクリプトは、URL にバージョンが入り、チェックサムも一緒に配布されています。**公式 README の最新のコマンドをそのまま貼り付けてください**（ここに載せたものは執筆時点のものです）。

デプロイは Cloudflare 公式の action を使います。

```yaml
      - name: Apply D1 migrations
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: d1 migrations apply DB --remote

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: deploy --minify
```

**マイグレーションはデプロイの前に流します。** 逆にすると、新しいコードが存在しない列を触る瞬間が生まれます。

フロント側は、ビルド時に API の URL を埋め込んでからデプロイします。

```yaml
      # VITE_ の環境変数はビルド時に埋め込まれる。シークレットを入れてはいけない
      - run: npm run build -w apps/web
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
```

`secrets` ではなく `vars`（GitHub の Variables）を使っているのは、この値が公開されるものだからです。**シークレットではないものをシークレットに入れると、「秘密にすべきもの」の境界が曖昧になります。**

**必要なシークレット**

| 名前 | 種類 | 中身 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | Workers と D1 の編集権限を持つ API トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare のアカウント ID |
| `VITE_API_URL` | Variable | デプロイした API の URL |

`BETTER_AUTH_SECRET` は GitHub には登録しません。**Cloudflare 側に `wrangler secret put` で入れておけば、デプロイしても消えません。**

---

# 6 フロントから API を呼ぶ

ここで2章と3章の成果物を接続します。**この章ではページを増やしません。** 2章で作った画面を、そのまま API に繋ぐことに専念します。

この章を終えると、「認証付きの、自分専用のメモアプリ」として一度完成します。

## 6.0 `async` / `await` と Promise

**何のために**

ネットワーク通信は、結果が返ってくるまで時間がかかります。JavaScript ではこれを Promise という仕組みで扱い、`async` / `await` で読みやすく書きます。2.3 で扱わなかったのは、実際に使う場面がここまで無かったためです。

**扱うこと**

- 同期処理と非同期処理
- Promise の3つの状態
- `async` 関数と `await`
- `try` / `catch` によるエラー処理

## 6.1 CORS

**何のために**

フロントエンドとバックエンドは別のドメインにデプロイされています。ブラウザは、あるオリジンから別のオリジンへのリクエストを既定で制限します。この制限を明示的に緩める設定が CORS です。

**扱うこと**

- 同一オリジンポリシーとは何か、なぜ存在するのか
- オリジンの定義（スキーム + ホスト + ポート）
- プリフライトリクエスト
- Hono の CORS ミドルウェア
- 許可するオリジンを環境変数で切り替える
- `Authorization` ヘッダーを許可する設定

**実装**

Hono の CORS ミドルウェアを、すべてのルートの手前に置きます。許可するオリジンは 3.5 で用意した環境変数から読みます。

```ts
import { cors } from 'hono/cors'

const app = new Hono<Env>()
  // フロントは別オリジンにデプロイするため、明示的に許可する
  .use('*', (c, next) =>
    cors({
      origin: c.env.CORS_ORIGIN,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['set-auth-token'],
      credentials: true,
    })(c, next),
  )
```

`cors()` を直接 `use` に渡さず、`(c, next) => cors({...})(c, next)` と包んでいるのは、**`c.env` がリクエストのコンテキスト経由でしか取れないため**です（3.5）。設定を組み立てるのもリクエストごとになります。

`exposeHeaders` に `set-auth-token` を入れるのを忘れないでください。**クロスオリジンでは、ブラウザの JavaScript から読めるレスポンスヘッダーが既定で制限されており、明示しないとトークンを取り出せません。**

**Better Auth 側にも設定が要ります**

CORS を通しただけでは、まだサインアップもログインもできません。Better Auth は、リクエストの `Origin` が自分の `baseURL` と異なる場合、**`Invalid origin` として 403 で弾きます。** フロントのオリジンを信頼する設定を足します。

```ts
betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  // 登録しないと、ブラウザからのサインアップ・ログインが "Invalid origin" で失敗する
  trustedOrigins: [env.CORS_ORIGIN],
  // ...
})
```

**`curl` では再現しません。** `curl` は `Origin` ヘッダーを送らないためです。ブラウザから初めて叩いたときに気づく種類の設定です。

**完了条件**

ブラウザの開発者ツールで CORS エラーが出ない状態で、フロントから API を呼べる。

**躓きポイント**

- **CORS はブラウザの制限です。** `curl` では成功するのにブラウザでは失敗する、という現象はここが原因です
- `Access-Control-Allow-Origin: *` は手軽ですが、本番では使わないでください。許可するオリジンを明示します
- ローカル開発時のオリジン（`http://localhost:5173`）と本番のオリジンは異なります。両方を許可する設定が必要です

## 6.2 素の fetch で呼ぶ

**何のために**

まず最小の形で接続します。この段階では、キャッシュもローディング状態の管理も自前で書くことになります。**この不便さを体感しておくことが、6.4 で React Query を導入する動機になります。**

**扱うこと**

- `fetch` の基本
- `useEffect` の中で非同期処理を行う
- ローディング状態とエラー状態を自前で管理する
- 2章で作った「メモリ上の配列」を API 呼び出しに置き換える

**完了条件**

ページをリロードしてもデータが消えず、API から取得したメモが表示される。

**躓きポイント**

- `useEffect` のコールバック関数に直接 `async` を付けることはできません。中で非同期関数を定義して呼びます
- 同じデータを複数のコンポーネントで使うと、それぞれが個別にリクエストを送ります
- コンポーネントがアンマウントされたあとに `setState` が呼ばれると警告が出ます
- 型が付きません。`fetch` の戻り値は `any` 相当で、レスポンスの形を手で書くことになります → 6.3 で解決します

## 6.3 Hono RPC で型安全に呼ぶ

**何のために**

バックエンドのハンドラの定義から、クライアント側の型を自動的に導出します。API のパスやリクエストの形を変更したとき、フロント側の型エラーとして検出できるようになります。

**扱うこと**

- バックエンドから `AppType` を型としてエクスポートする
- `apps/web` から `apps/api` を workspace の依存として参照する
- `hc` クライアントの生成
- 型が効いていることの確認（存在しないパスを叩くと型エラーになる）

**完了条件**

エディタ上で、API のパスとリクエストボディが補完される。バックエンドのスキーマを変更すると、フロント側で型エラーが出る。

**躓きポイント**

- **`import type` を使ってください。** 通常の `import` で書くと、バックエンドの実装コードがフロントエンドのバンドルに含まれてしまいます
- **3.3 で触れた通り、ルーティングをメソッドチェーンで書いていないと型が導出されません**
- **3.7 のバリデータを通していないと、リクエストボディの型が付きません**
- ルート数が増えると型推論が重くなり、エディタの補完が遅くなることがあります

**workspace をまたいで型を参照する**

必要なのは `tsconfig` の `paths` だけです。**project references もビルド手順の追加も要りません。**

`apps/web/tsconfig.app.json` に追記します。

```jsonc
{
  "compilerOptions": {
    "paths": {
      "api": ["../api/src/index.ts"]
    }
  },
  "include": ["src", "../api/worker-configuration.d.ts"]
}
```

`include` に `worker-configuration.d.ts` を足しているのは、`apps/api` のコードが `CloudflareBindings`（3.5 で生成した型）をグローバルに参照しているためです。これが無いと、フロント側で型解決に失敗します。

**Vite の設定は変更不要です。** 型だけを `import type` で読むので、バンドラはこの import を見る前に消してしまいます。

**クライアントを作る**

`apps/web` に `hono` を入れます（`hono/client` を使うため）。

```bash
npm i -w apps/web hono
```

`apps/web/src/lib/api.ts`:

```ts
import { hc } from 'hono/client'
import type { AppType } from 'api'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export const TOKEN_KEY = 'memo-app-token'

export const client = hc<AppType>(API_URL, {
  // オブジェクトで渡すと生成時の値で固定されるため、関数で渡す
  headers: (): Record<string, string> => {
    const token = localStorage.getItem(TOKEN_KEY)
    return token === null ? {} : { Authorization: `Bearer ${token}` }
  },
})
```

呼び出しは、パスがそのままプロパティになります。

```ts
await client.posts.$get()
await client.posts.$post({ json: { title, content } })
await client.posts[':id'].$put({ param: { id }, json: { title, content } })
await client.posts[':id'].$delete({ param: { id } })
await client.users[':userId'].posts.$get({ param: { userId } })
```

**レスポンスの型を再利用する**

`InferResponseType` で、API のレスポンスから型を取り出せます。フロント側で `Post` 型を手書きする必要がなくなります。

```ts
import type { InferResponseType } from 'hono/client'
import type { client } from './lib/api'

export type Post = InferResponseType<typeof client.posts.$get>[number]
```

**この型の `createdAt` は `Date` ではなく `string` です。** 3.6 で触れた通り、JSON になる過程で ISO 文字列に変わるからです。**型がその事実を正しく伝えている**ことが、RPC の分かりやすい利点です。

**完了条件**

エディタ上で、API のパスとリクエストボディが補完される。存在しないパス（`client.nosuchpath`）を書くと型エラーになる。

**追加の躓きポイント**

- **Better Auth のエンドポイント（`/auth/*`）は RPC の型に乗りません。** ワイルドカードで登録しているためです。サインアップ・ログインは素の `fetch` で呼びます（6.5）

## 6.4 React Query に載せる

**何のために**

6.2 で自前で書いたローディング管理、エラー処理、重複リクエストの排除を、ライブラリに任せます。加えて、401 が返ったときの処理を一箇所にまとめられます。

**扱うこと**

- `useQuery` によるデータ取得
- `useMutation` による更新
- キャッシュと再取得のタイミング
- 更新後にキャッシュを無効化する
- 401 が返ったときにログイン画面へ遷移させる共通処理

**完了条件**

6.2 と同じ動作をしつつ、コードから手書きのローディング管理が消えている。同じデータを複数のコンポーネントで使っても、リクエストは1回になっている。

**自動リトライを止める**

React Query は、失敗したクエリを既定で3回まで自動的に再試行します。**このアプリでは切ってください。**

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 404 や 401 は「取得し直せば直る」ものではないので、既定の自動リトライを止める。
      // 付けたままだと、見つからないメモの画面が数秒間「読み込み中…」で止まる
      retry: false,
    },
  },
})
```

このアプリでクエリが失敗する主な原因は 404（存在しない・権限がない）と 401（未ログイン）で、どちらも再試行しても結果は変わりません。7.2 で作る「非公開メモに未ログインでアクセスしたときの画面」が、リトライを待つ数秒間ずっと「読み込み中…」のままになるのを防げます。

**躓きポイント**

- クエリキーの設計が重要です。キーが同じなら同じキャッシュを参照します
- 更新後にキャッシュを無効化しないと、画面が古いままになります

## 6.5 認証情報の受け渡し

**何のために**

3.10 で実装した認証を、フロントエンドから使えるようにします。

**構成**

- トークンは **localStorage** に保存する
- リクエストの `Authorization: Bearer <token>` ヘッダーに付与する

**扱うこと**

- サインアップ画面（メールアドレス、パスワード、**ユーザー ID**、**表示名**）
- ログイン画面
- ログイン時にトークンを保存する
- `hc` クライアントにヘッダーを付与する
- ログアウト時にトークンを削除する
- 未ログイン時のリダイレクト

**完了条件**

ログインすると自分のメモだけが表示され、ログアウトするとログイン画面に戻る。リロードしてもログイン状態が維持される。

**躓きポイント**

- **`hc` の `headers` は関数で渡してください。** オブジェクトで渡すと、クライアントを生成した時点の値で固定され、ログイン直後にトークンが反映されません
- **エラーレスポンスの本文は、空のことがあります。** `await res.json()` を無条件に呼ぶと、画面に出るのが `Unexpected end of JSON input` という無関係なエラーになり、本当の原因（サーバーが 500 を返していること）が見えなくなります。`await res.text()` で受けて、空ならステータスコードを表示してください

  ```ts
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body === '' ? `エラーが発生しました (${res.status})` : body)
  }
  ```
- トークンが失効したときの挙動を決めておかないと、401 が返り続けて画面が固まります
- ユーザー ID は変更不可なので、サインアップ画面でその旨を明示してください

### localStorage に保存することのリスク

**localStorage に保存したトークンは、JavaScript から読み取れます。** つまり、XSS の脆弱性が1つでもあれば、トークンは盗まれます。

HttpOnly 属性を付けた Cookie であれば JavaScript からは読めないため、この点では安全です。今回 localStorage を選んだのは、クロスオリジンの Cookie に伴う制約（`SameSite=None; Secure` の要求、ブラウザのトラッキング防止機能の影響）を避け、構成を単純に保つためです。

**学習用の構成としては妥当ですが、実務でこれを選ぶ場合は以下がセットで必要です。**

- XSS 対策の徹底（React は既定でエスケープするが、`dangerouslySetInnerHTML` などの抜け道がある）
- 依存パッケージの管理（1.4 のサプライチェーン攻撃の話がここに繋がります。侵害されたパッケージが1つ入るだけで、localStorage の中身は外部に送信されます）
- トークンの有効期限を短くする設計

「トークンをどこに置くか」に絶対的な正解はなく、それぞれにトレードオフがあります。この記事の構成が唯一の選択肢ではないことは理解しておいてください。

## 6.6 環境変数を追加して再デプロイ

**何のために**

フロントエンドから API を呼ぶには、API の URL を知っている必要があります。ローカルと本番で異なるため、環境変数で切り替えます。

**扱うこと**

- Vite の環境変数（`VITE_` 接頭辞と `import.meta.env`）
- ローカル用の `.env.local` と本番用の設定
- GitHub Actions のビルド時に環境変数を渡す
- CORS の許可オリジンに本番のフロントエンドの URL を追加する

**完了条件**

デプロイされた本番環境で、サインアップ・ログイン・メモの CRUD が一通り動作する。

**躓きポイント**

- **`VITE_` 接頭辞の環境変数は、ビルド成果物に平文で埋め込まれます。** ブラウザの開発者ツールから読めるので、シークレットを入れてはいけません。API の URL のような公開情報のみを入れます
- 本番のフロントエンドの URL を CORS の許可リストに追加し忘れると、ローカルでは動くのに本番で動かない状態になります

---

# 7 機能を拡張する

6章までで、自分専用のメモアプリが動いています。ここに公開機能を追加します。

## 7.1 公開・非公開の切り替え

**何のために**

3.6 で `is_public` カラムを作りましたが、まだ UI から操作できません。個別ページに切り替えの UI を追加します。

**扱うこと**

- 個別ページにトグル（またはチェックボックス）を追加する
- `useMutation` で更新する
- 公開状態を一覧でも分かるように表示する
- 公開したメモの URL をコピーできるようにする

**完了条件**

個別ページで公開に切り替えると、一覧にも公開中であることが表示される。リロードしても状態が維持される。

**躓きポイント**

- **公開に切り替えるのは、意図しないと起きない操作にしてください。** 確認を挟むか、公開状態を明確に表示するかのどちらかは必要です
- 更新後にキャッシュを無効化しないと、一覧の表示が古いままになります

## 7.2 未ログインでも見られるページの土台を作る

**何のために**

ここまでのアプリは、すべてのページがログインを前提としていました。公開ページを作る前に、ルーティングを認証必須のページと未認証可のページに分ける必要があります。

**扱うこと**

- ルートを2種類に分ける（認証必須 / 未認証可）
- 認証状態に応じたヘッダーの出し分け（ログイン中はユーザー名とログアウト、未ログインはログインリンク）
- 未認証可のページで、ログインしていれば追加の操作（自分のメモなら編集ボタン）を出す
- `GET /posts/:id` を「任意認証」で呼ぶ

**完了条件**

- ログアウトした状態で `/posts/:id`（公開メモ）にアクセスすると、閲覧できる
- 同じ URL に所有者がログインした状態でアクセスすると、編集できる
- 非公開メモの URL に未ログインでアクセスすると、404 相当の画面になる

**躓きポイント**

- **「未ログインならログイン画面へリダイレクト」という単純な処理は、ここで成立しなくなります。** ページごとに扱いが違うためです
- 未ログイン時に API を呼ぶ際、`Authorization` ヘッダーに `Bearer undefined` のような値を送らないよう注意してください

## 7.3 公開一覧ページ `/public`

**何のために**

全体公開されているメモの一覧を表示します。3.11 で作った `GET /public/posts` を使います。

**扱うこと**

- 未認証でアクセスできるページの追加
- 投稿者の表示名と、そのユーザーページへのリンク
- 一覧の件数制限（またはページネーション）

**完了条件**

ログアウトした状態で `/public` にアクセスすると、公開メモの一覧が投稿者名付きで表示される。非公開メモが含まれていない。

## 7.4 ユーザーページ `/users/:userId`

**何のために**

特定のユーザーが公開しているメモの一覧を表示します。3.11 で作った `GET /users/:userId/posts` を使います。

**扱うこと**

- URL パラメータからユーザー ID を取得する
- 存在しないユーザー ID のときの表示
- 表示名とユーザー ID の使い分け（URL には ID、画面には表示名）

**完了条件**

`/users/<ユーザーID>` にアクセスすると、そのユーザーの公開メモだけが表示される。存在しない ID では 404 相当の画面になる。

**躓きポイント**

- ユーザー ID は変更不可にしているため、この URL は安定して共有できます。もし変更可能にしていたら、共有された URL が壊れることになります

## 7.5 CSR の限界

**何のために**

ここまでで、公開メモアプリとして機能するものができました。しかし、この構成には満たせない要件があります。**それを実際に確認します。**

**手を動かして確認すること**

デプロイした公開ページに対して、`curl` でリクエストを送ります。

```bash
curl https://<フロントエンドのURL>/posts/<公開メモのID>
```

返ってくる HTML に、メモの本文が含まれていないことを確認してください。ブラウザで「ページのソースを表示」しても同じです。表示されているのは、ほぼ空の `<div id="root">` だけのはずです。

**何が起きているのか**

CSR (Client Side Rendering) では、サーバーが返すのは空の HTML と JavaScript です。コンテンツは、ブラウザが JavaScript を実行し、API からデータを取得してから描画されます。

この性質は、以下の場面で問題になります。

- **検索エンジン**: 主要な検索エンジンは JavaScript を実行しますが、クロールの予算やレンダリングの遅延という制約があります。通常の HTML より不利です
- **SNS のリンクプレビュー**: SNS のクローラーは基本的に JavaScript を実行しません。`<title>` や OGP を JavaScript で書き換えても、プレビューには反映されません。公開メモを共有したときに、タイトルも説明も出ないカードになります

つまり、**「公開メモアプリ」を名乗りながら、公開したメモを共有したときの体験が良くない**という状態です。

**解決するには何が必要か**

サーバー側で HTML を生成する仕組み（SSR または SSG）が必要です。React Router なら Framework mode、他に Next.js などの選択肢があります。

**ただし、それはこのロードマップの構成を作り直すことを意味します。**

| 変わるもの | 影響 |
|---|---|
| ルーティングの書き方 | 2.10 の内容が別物になる |
| データ取得の仕組み | `loader` / `action` が加わり、React Query との住み分けが必要（6.4） |
| デプロイ構成 | フロント側もサーバーになる（5.2） |
| CORS の前提 | 同一オリジンにできる可能性（6.1） |
| 認証トークンの置き場所 | サーバー側から読めない localStorage は見直しが必要（6.5） |

2章・5章・6章の判断を同時に覆すことになります。だからこの記事では扱いません。

**この節で持ち帰ってほしいこと**

技術選定は、最初の判断が後から効いてきます。「まず CSR で作って、後から SSR にする」は、言葉ほど簡単ではありません。

同時に、「常に SSR を選ぶべき」でもありません。ログインが前提のアプリなら、この問題はそもそも発生しません。今回のアプリで問題になったのは、**公開ページという要件を後から足したから**です。

次に何かを作るときは、この判断を最初に行ってみてください。

---

# 8 E2E テストを行う

**何のために**

4章の単体テストは、フロントとバックをそれぞれ独立して検証するものでした。E2E テストは、両者を実際に繋いだ状態で、ユーザーの操作をブラウザ上で再現して検証します。

**使うもの**

Playwright

**実行対象**

ローカルの開発サーバー（`apps/web` と `apps/api` の両方を起動した状態）に対して実行します。

本番環境に対して実行する構成も考えられますが、デプロイ完了を待つ制御が必要になり、テストデータが本番のデータベースに残るという問題もあります。ローカル実行なら D1 のローカル環境が使え、テストごとにデータベースをリセットできます。

**注記**: この構成では「デプロイされた本番が実際に動くか」は自動検証されません。5章でデプロイしたあとの確認は手動になります。

**テストシナリオ**

1. サインアップ → ログイン → メモを作成 → 一覧に表示される
2. ログイン → メモを編集 → 更新が反映される → 削除する
3. 未ログイン状態で `/`（自分のメモ一覧）にアクセス → ログイン画面にリダイレクトされる
4. メモを公開に設定 → ログアウト → その URL に直接アクセスして閲覧できる
5. 非公開メモの URL に未ログインでアクセス → 404 相当の画面になる
6. 未ログインで `/public` にアクセス → 公開メモの一覧が表示され、非公開メモが含まれない

**3〜6 が認可の検証です。** 単体テストでも認可は確認しますが、E2E では「ブラウザから実際にその画面に到達できるか」を含めて検証できます。ルーティングの設定漏れは単体テストでは見つかりません。

**扱うこと**

- Playwright のセットアップ
- 2つの開発サーバーを起動した状態でテストを実行する設定
- セレクタの選び方（`getByRole` などのアクセシビリティに基づく指定を優先する）
- テストごとにデータベースをリセットする
- 複数ユーザーを使うテストの書き方
- GitHub Actions での実行

**完了条件**

`npx playwright test` で6つのシナリオがすべて通る。CI でも同様に通る。

**躓きポイント**

- **セレクタに CSS クラス名を使わないでください。** スタイルを変えるたびにテストが壊れます。`getByRole` や `getByLabelText` を使います
- テスト間でデータが残ると、実行順によって結果が変わります
- WSL では Playwright のブラウザに必要なシステムライブラリが不足していることがあります。`npx playwright install-deps` が必要です
- CI ではヘッドレスモードで動くため、ローカルで見えていた問題が見えなくなります。失敗時のスクリーンショットとトレースを保存する設定を入れておくと切り分けが楽になります

**セットアップ**

```bash
npm i -D @playwright/test
npx playwright install chromium
```

WSL では、ブラウザの動作に必要なシステムライブラリが足りないことがあります。その場合は `npx playwright install --with-deps chromium` を使ってください（`sudo` を求められます）。

**設定**

リポジトリのルートに `playwright.config.ts` を置きます。

```ts
import { defineConfig } from '@playwright/test'

const WEB_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:8787'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'dot' : 'list',

  use: {
    baseURL: WEB_URL,
    // 失敗したときに原因を追えるようにする
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // フロントと API の2つを起動する。
  // ローカル D1 の作り直しは、サーバーを起動する前に同じコマンドの中で行う
  webServer: [
    {
      command:
        'rm -rf apps/api/.wrangler/state/v3/d1 && npm run db:migrate:local -w apps/api && npm run dev -w apps/api',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
    },
    {
      command: 'npm run dev -w apps/web',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
    },
  ],
})
```

`url` に指定したアドレスが応答するまで、Playwright はテストを始めません。API 側に `/health`（3.3）を作っておいたのが、ここで効いてきます。

**データベースのリセットをどこでやるか**

`globalSetup` でローカル D1 を消してはいけません。**`webServer` は `globalSetup` より先に起動する**ため、起動済みのサーバーが開いているファイルを消すことになり、以降のリクエストがすべて 500（`SQLITE_CANTOPEN`）になります。

上記のように、**サーバーを起動するコマンドの中で、起動前に消す**のが確実です。

**テストを書く**

```ts
import { expect, test, type Page } from '@playwright/test'

// 実行のたびに別のユーザーを使う（サインアップの重複を避ける）
const unique = () => Math.random().toString(36).slice(2, 8)

const signUp = async (page: Page, userId: string) => {
  await page.goto('/signup')
  await page.getByLabel('メールアドレス').fill(`${userId}@example.com`)
  await page.getByLabel('パスワード').fill('password1234')
  await page.getByLabel('表示名').fill(`${userId} の表示名`)
  await page.getByLabel('ユーザー ID', { exact: false }).fill(userId)
  await page.getByRole('button', { name: '登録する' }).click()
  await expect(page.getByRole('heading', { name: 'メモ' })).toBeVisible()
}

test('公開したメモは、ログアウトしても URL から読める', async ({ page }) => {
  await signUp(page, `u${unique()}`)
  await createPost(page, '公開する日記', 'みんなに見せる')

  await page.getByRole('link', { name: '公開する日記' }).click()
  page.once('dialog', (dialog) => dialog.accept())   // 公開の確認ダイアログ
  await page.getByRole('button', { name: '公開する' }).click()
  await expect(page.getByText('状態: 公開中')).toBeVisible()

  const url = page.url()
  await page.getByRole('button', { name: 'ログアウト' }).click()

  await page.goto(url)
  await expect(page.getByRole('heading', { name: '公開する日記' })).toBeVisible()
})
```

**CI での実行**

```yaml
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          CI: "true"

      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**追加の躓きポイント**

- **ページ遷移の完了を待たずに入力すると、遷移前のページに書き込みます。** 一覧から詳細へ移動した直後に `getByPlaceholder('タイトル')` を触ると、一覧側の入力欄が先に見つかることがあります（どちらのページにも同じ placeholder があるため）。`await expect(page.getByRole('heading', { name: 'メモの編集' })).toBeVisible()` のように、**遷移先の目印を1つ待ってから**操作してください
- **部分一致に注意してください。** `getByRole('link', { name: '公開-abc' })` は `非公開-abc` にも一致します。`{ exact: true }` を付けます
- `window.confirm` を出す操作は、`page.once('dialog', ...)` を**クリックの前に**登録します

---

# 9 任意) 開発環境をさらに整える

ここまでで、アプリの開発からデプロイまでが一通り動く状態になりました。この章では、日々の作業を効率化するツールを紹介します。**いずれも必須ではありません。**

## 9.1 Claude Code

**何のために**

ターミナル上で動くコーディングエージェントです。コードベースを読んだうえで、実装やリファクタリング、調査を任せられます。

**扱うこと**

- インストールと認証
- `CLAUDE.md` によるプロジェクト固有の指示
- 権限設定

**手順**

WSL のターミナルで実行します（Windows 側ではなく、WSL の中に入れます）。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**完了条件**

`claude --version` がバージョンを表示する。`claude doctor` が設定の診断結果を表示する。プロジェクトのディレクトリで `claude` を実行すると、対話セッションが始まる。

**躓きポイント**

- **利用には Pro / Max / Team / Enterprise / Console のいずれかのアカウントが必要です。** 無料の Claude.ai プランには含まれません
- 初回は `claude` を実行するとブラウザでのログインを求められます
- npm でグローバルインストールする方法もありますが、**`sudo npm install -g` は使わないでください**（権限の問題が起きます）
- ネイティブインストーラで入れた場合、更新はバックグラウンドで自動的に行われます

参考: https://code.claude.com/docs/en/setup

## 9.2 herdr

**何のために**

複数のコーディングエージェントを同時に動かすときに、ターミナルのワークスペースを管理するツールです。どのエージェントが作業中で、どれが入力待ちかを一覧できます。

**注記**

エージェントを複数並行して動かすようになってから価値が出るツールです。1つのエージェントを使っている段階では、通常のターミナルで十分です。

https://herdr.dev/

## 9.3 その他

- `ghq` + `fzf` によるリポジトリ間の移動（1.7 の続き）
- シェルのプロンプトのカスタマイズ
- `.editorconfig` によるエディタ設定の共有

---

# 執筆メモ

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

- **章をまたぐ参照が多い。** 「3.3 で触れた通り」「6.5 で再度触れます」といった記述が各所にある。分割時にはファイル間リンクに置き換えること。特に多いのは以下の経路
  - 1.4 サプライチェーン攻撃 → 6.5 localStorage のリスク
  - 2.13 CSR/SSG/SSR/ISR → 7.5 CSR の限界
  - 3.3 メソッドチェーン → 6.3 Hono RPC
  - 3.7 バリデーション → 6.3 Hono RPC
  - 2.1 `.gitignore` → 3.5 環境変数
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
| OS | WSL2 (Ubuntu) 固定。mac/Linux は 1.1 をスキップ |
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
| SEO | 対策はしない。7.5 で CSR の限界として提示し、次の一歩の入り口とする |

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
| 2.10 | React Router v8。モードの呼称（Framework / Data / Declarative）は変わっていない |
| 2.11 | ESLint 10 + typescript-eslint + Prettier 3。`eslint-config-prettier` は不要 |
| 3.2 | `create-hono` 0.19 系の生成物。`"private": true` は入っていない |
| 3.5 | `wrangler types` が `vars` をリテラル型、`.dev.vars` のキーを `string` として生成する |
| 3.6 | Drizzle 0.45 / drizzle-kit 0.31。ローカル D1 は `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` |
| 3.7 | `@hono/zod-validator` 0.9 + zod 4 |
| 3.10 | Better Auth 1.7。D1 の組み込みサポートはあるが、この記事は Drizzle アダプタを使う。`drizzleAdapter` には `schema` を渡す必要がある。トークンは `set-auth-token` ヘッダー |
| 4 | Vitest 4 + Testing Library 16 / `@cloudflare/vitest-pool-workers` 0.22（`cloudflareTest` プラグイン形式） |
| 6.3 | RPC の型共有は `tsconfig` の `paths` だけで足りる（project references 不要） |
| 6.1 | CORS に加えて Better Auth の `trustedOrigins` が必要 |
| 8 | Playwright 1.62。`webServer` は `globalSetup` より先に起動する |

## 未確認の事項

**Cloudflare のアカウントが必要なため、まだ実機で確認できていません。**

- 3.1: `wrangler login` の実際の画面遷移
- 3.6: `wrangler d1 create` の出力
- 5.1: API トークンの発行画面と、必要な権限の最小セット
- 5.2: GitHub Actions が実際に通ること（ワークフローは書いたが、push していない）
- 6.6: 本番環境での通しの動作確認
- 7.5: デプロイしたフロントに `curl` を投げ、初期 HTML に本文が含まれないことの実測

その他:

- 2.9: 図の作成（必要な図の一覧は本文に記載済み）
- 記事の `docs/` 分割（下記「ドキュメントの構成」を参照）

## 調査時の原則

技術的な事柄を調べるときは、**第1に公式ドキュメントを当たること。** 公式ドキュメントが不十分な場合は実装を調べること。ブログ等の二次情報を公式の記述として扱わないこと。
