# 1 環境構築

この章では、以降の章で使う開発環境を用意し、[1.8](#18-リポジトリと-workspace-を作る) でアプリのリポジトリを作ります。「任意)」と付いた節は、飛ばしても先に進めます。

**ターミナルの操作に自信がない場合は、先に [1.6](#16-ターミナル操作に慣れる) を読んでください。** この章では最初からコマンドを打つことになります。

## 1.1 WSL2 (Ubuntu)

Node.js のツールチェーンは Linux 環境を前提に作られているものが多く、Windows ネイティブで動かすとパスの区切り文字や改行コード、シンボリックリンクの扱いで問題が出ます。Linux 環境を Windows 上に用意することで、これらを回避します。

インストール方法は以下のリンクを参照してください。

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

Microsoft は WSL 上での開発環境構築ガイドも公開しています。Git や認証まわりも含めて一通り確認したい場合に使えます。

参照: https://learn.microsoft.com/ja-jp/windows/wsl/setup/environment

## 1.2 VS Code + WSL 拡張

VS Code 本体は Windows 側にインストールし、WSL 拡張を通して Linux 側のファイルを編集します。この構成にすると、VS Code の統合ターミナルがそのまま Ubuntu のシェルになり、拡張機能も Linux 側で動きます。

インストール方法は以下のリンクを参照してください。

https://code.visualstudio.com/

WSL 拡張の導入と使い方は、以下のリンクを参照してください。

https://code.visualstudio.com/docs/remote/wsl

Ubuntu のターミナルで `code .` を実行すると VS Code が開き、左下に「WSL: Ubuntu」と表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - VS Code 本体を WSL 内に `apt` で入れないでください。Windows 側に入れた本体に WSL 拡張を追加するのが正しい構成です
> - 拡張機能には「Windows 側にインストールされるもの」と「WSL 側にインストールされるもの」があります。言語サポート系（TypeScript や Lint ツールなど）は WSL 側に入れる必要があり、拡張機能の一覧に「WSL: Ubuntu にインストール」ボタンが出ます
> - Windows のエクスプローラーから `\\wsl$\Ubuntu\...` を開いて編集することもできますが、この記事では扱いません

## 1.3 nvm

**Node.js は、ブラウザの外で JavaScript を動かすための実行環境です。** JavaScript はもともとブラウザ用の言語でしたが、Node.js によってサーバーやコマンドラインツールも JavaScript で書けるようになりました。この記事で使う開発サーバー、ビルドツール、テストランナーは、すべて Node.js の上で動きます。

**npm は Node.js に同梱されているパッケージマネージャです。** 他人が公開したライブラリを取り込み、その一覧を `package.json` に記録します。以降 `npm` で始まるコマンドを何度も打ちますが、やっていることはたいてい「依存を入れる」か「`package.json` に書いたスクリプトを実行する」かのどちらかです。

**nvm は、その Node.js のバージョンを切り替えるためのツールです。** プロジェクトごとに要求される Node.js のバージョンは異なり、複数のプロジェクトを並行して触ると必ず衝突します。nvm を入れておくと、ディレクトリを移動するだけで適切なバージョンに切り替わる状態を作れます。

インストール方法は以下のリンクを参照してください。

https://github.com/nvm-sh/nvm#install--update-script

新しいターミナルを開いて `command -v nvm` を実行し、`nvm` と表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - **`which nvm` では確認できません。** nvm はシェル関数として読み込まれるもので、実行可能ファイルではないためです。公式が案内している通り `command -v nvm` を使ってください
> - インストール直後は現在のターミナルに反映されていません。ターミナルを開き直すか、`source ~/.bashrc` を実行してください
> - WSL で `Could not resolve host: raw.githubusercontent.com` が出る場合、DNS の設定が原因のことがあります。公式 README の WSL Troubleshooting に対処法があります: https://github.com/nvm-sh/nvm#wsl-troubleshooting

### LTS 版の Node.js をインストールする

LTS (Long Term Support) は長期サポート対象のリリースラインで、偶数バージョンが該当します。特別な理由がない限り LTS を使います。

参照: https://github.com/nvm-sh/nvm#long-term-support

```bash
nvm install --lts
nvm alias default 'lts/*'
```

1行目で最新の LTS をインストールし、2行目で新しいターミナルを開いたときのデフォルトに設定します。

新しいターミナルを開き、`node -v` と `npm -v` がバージョンを返せば成功です。

**つまずきポイント**

> [!TIP]
> - `lts/*` のクォートは必要です。付けないとシェルがワイルドカードとして解釈します
> - **`nvm alias default` は、初回インストールなら省略しても動きます。** nvm は default が未設定のときに、インストールしたバージョンを自動で default にするためです（`Creating default alias: ...` と表示されます）。それでも明示するのは、**特定のバージョンではなく「その時点の LTS」を指させる**ためです。こうしておくと、あとで新しい LTS を入れたときに default が自動で追従します

### `cd` したときに自動でバージョンを切り替える

プロジェクトのルートに `.nvmrc` というファイルを置くと、そのプロジェクトが要求する Node.js のバージョンを宣言できます。ただし標準では、ディレクトリを移動したあとに `nvm use` を手動で叩く必要があります。これを自動化します。設定方法は以下のリンクを参照してください。

https://github.com/nvm-sh/nvm#bash

上記リンク先の「Automatically call `nvm use`」にある bash 向けのコードを、`$HOME/.bashrc` の末尾に貼り付けます。ファイルは `code ~/.bashrc` で開けます。

**コピーする範囲は `cdnvm() {` から、最後の `cdnvm "$PWD" || exit` までです。** 関数だけを貼って末尾の `alias cd='cdnvm'` を落とすと、`cd` が置き換わらないため何も起こりません。

貼り付けたら `source ~/.bashrc` を実行するかターミナルを開き直し、次の手順で動作を確認します。

```bash
mkdir -p ~/nvmrc-test && cd ~/nvmrc-test
echo "lts/*" > .nvmrc
cd ..
cd nvmrc-test   # ここで "Now using node ..." と表示されれば成功
```

確認できたら `cd ~ && rm -rf ~/nvmrc-test` で片付けてください。**`rm -rf` は確認なしに消します。** パスを2回読んでから実行してください（[1.6](#16-ターミナル操作に慣れる)）。

**つまずきポイント**

> [!TIP]
> - **貼り付ける位置は、nvm を読み込む行より後でなければなりません。** nvm のインストーラが `.bashrc` に追記した `[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"` の行より下に置いてください。上に置くと `nvm_find_up: command not found` になります
> - このスクリプトは `cd` をエイリアスで置き換えます。副作用として、`cd` するたびに `.nvmrc` の探索が走るぶんだけ動作が重くなります
> - **公式 README はこのレシピを「利用者から寄せられたもので、nvm のメンテナはサポートしない」と明示しています。** 動かなくなったときに公式のサポートは期待できない点は理解した上で使ってください
> - zsh を使っている場合はスクリプトが異なります: https://github.com/nvm-sh/nvm#zsh

## 1.4 サプライチェーン攻撃の対策

### サプライチェーン攻撃とは

自分が書いたコードに問題がなくても、依存しているパッケージが侵害されれば被害を受けます。これがサプライチェーン攻撃です。

npm のエコシステムでは、この攻撃が繰り返し発生しています。典型的な流れはこうです。

1. 攻撃者が、広く使われているパッケージのメンテナのアカウントを乗っ取る（フィッシングが多い）
2. そのパッケージに悪意あるコードを仕込んだ新バージョンを公開する
3. `npm install` した開発者のマシンで、インストール時のスクリプトが実行される
4. 環境変数、`.npmrc` のトークン、クラウドの認証情報などが外部に送信される

被害の範囲は、直接依存しているパッケージだけではありません。依存の依存、そのまた依存まで含めた全体（依存ツリー）のどこか1つが侵害されれば成立します。中規模のプロジェクトでも依存ツリーには数百から千を超えるパッケージが含まれるため、すべてを人力で監査することは現実的ではありません。

**1つ設定すれば防げる、という決定版の対策は今のところありません。** 現実的なのは、効き方の違う対策を重ねること（多層防御）です。

- **インストール時にマルウェアを検知してブロックする**（この節で導入する safe-chain がこれにあたります）
- **公開直後のバージョンを避ける**（悪意あるバージョンは公開後まもなく検知・削除されることが多いため、一定時間待つだけでかなり避けられます）
- **ロックファイルをコミットし、CI では `npm ci` を使う**（意図しないバージョンへの更新を防ぐ）。ロックファイルとは `package-lock.json` のことで、**実際に入ったバージョンを1つ残らず記録したファイル**です。[2.1](02_frontend.md#21-npm-create-vitelatest) で最初の `npm install` を実行すると作られます
- **`npm audit` などで既知の脆弱性を定期的に確認する**（マルウェアではなく脆弱性向けですが、別の層として有効です）。**この記事では扱いません**が、`npm audit` は追加のインストールなしに実行できます

なお、これは「対策すれば安全」という話ではなく「被害の確率を下げる」話です。この点は [6.6](06_api-integration.md#66-認証情報の受け渡し) で認証トークンを localStorage に保存する際にもう一度触れます。

### npm の設定

npm 12 には、この攻撃を想定した仕組みがいくつか入っています。**リポジトリを作る前に、ユーザー全体の設定として入れておきます。**

```bash
npm config set min-release-age 3
```

ホームディレクトリの `~/.npmrc` に `min-release-age=3` と書かれます。**公開から3日経っていないバージョンを、依存の解決対象から外す**設定です。上に挙げた「公開直後のバージョンを避ける」を、npm 自身の機能で行うことになります。

`npm config get min-release-age` が `3` を返せば設定できています。

**これはユーザー全体の設定なので、この記事以外のプロジェクトにも効きます。** 公開直後のバージョンしか条件を満たさない場面（急いで出た修正版を入れたいときなど）では、かえって邪魔になります。そのときは次のどちらかで回避します。

```bash
npm install <パッケージ名> --min-release-age 0   # その1回だけ無視する
npm config delete min-release-age                # 設定そのものを消す
```

効いていることは、選ばれるバージョンで分かります。以下は執筆時点で `vite` の `^8.2.0` を解決させた結果です。

| 設定 | 選ばれたバージョン |
|---|---|
| なし | 8.2.2（公開から約30時間） |
| `min-release-age=3` | 8.2.1（公開から約2週間） |

**`npm ci` には効きません。** `npm ci` は `package-lock.json` に書かれたバージョンをそのまま入れるだけで、解決をやり直さないためです。効くのは `npm install` や `npm update` のように、npm がバージョンを選び直すときです。

**インストール時のスクリプトは、npm 12 では既定でブロックされます。** こちらは設定不要です。依存が `postinstall` などを持っていると、実行されずに警告だけが出ます。

```
npm warn install-scripts   esbuild@0.28.1 (install: (install scripts present))
npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
```

上に書いた手口の3〜4番目（インストール時のスクリプトで認証情報を盗む）に、正面から効く変更です。ブロックされたものは `npm install-scripts ls` で一覧でき、必要なら `npm install-scripts approve <パッケージ名>` で個別に許可します。**この記事で作るものは、どれも許可しないまま動きます。**

### safe-chain

safe-chain は Aikido Security が提供する OSS の CLI ツールで、`npm` や `npx` などのコマンドをラップし、インストールしようとしているパッケージがマルウェアとして報告されていないかを事前に確認します。無償で、アカウント登録もトークンも不要です。

インストール方法は以下のリンクを参照してください。

https://github.com/AikidoSec/safe-chain#installation

**インストールは、配布されているシェルスクリプトを取得して実行する形です。** サプライチェーン攻撃を扱う節でこれをやるのは落ち着かないところですが、**取得元が公式のリリースであることを URL で確認したうえで実行してください。** [5.2](05_deploy.md#52-github-actions-を構築する) の CI では、同じスクリプトをバージョン固定の URL から取得し、SHA-256 を照合してから実行しています。中身が差し替わっていないことを機械的に確認する方法です。

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
> - **`min-release-age` と safe-chain は、公開時刻での絞り込みが重なります。** `npm install` では両方がバージョンの候補を絞ります（safe-chain は `Some package versions were suppressed during package metadata resolution due to minimum package age` と表示します）。**違うのは、safe-chain がそれに加えてダウンロードそのものも止めることです。** ロックファイルに公開直後のバージョンが入っていると、`npm ci` は npm 側の設定を素通りして safe-chain に弾かれます
> - `.bashrc` への追記が nvm のものと並ぶことになります。動作がおかしい場合は、両者の記述順を確認してください

## 1.5 gh (GitHub CLI)

GitHub をコマンドラインから操作するツールです。この記事では主に認証のために使います。`gh auth login` を実行すると、GitHub CLI 自体の認証に加えて、`git push` する際の認証も同時に設定できます。ブラウザでトークンを発行して手動で設定する手間がなくなります。

インストール方法は以下のリンクを参照してください。

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

**コミットに使う名前とメールアドレスを設定する**

**`gh auth login` は、Git のユーザー名とメールアドレスまでは設定しません。** これは別に必要で、**設定しないと [1.8](#18-リポジトリと-workspace-を作る) の最初のコミットが `Author identity unknown` で失敗します。** Windows 側で設定していても、WSL の中には引き継がれません。

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

`git config --global --get user.email` が、設定した値を返せば成功です。

**この値はコミットに記録され、Public リポジトリなら誰でも見られます。** メールアドレスを公開したくない場合は、GitHub が発行する `noreply` アドレスを使えます。

参照: https://docs.github.com/ja/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address

**つまずきポイント**

> [!TIP]
> - Ubuntu には `git` が入っていない場合があります。`git --version` で確認し、無ければ `sudo apt install git` を実行してください
> - ブラウザ認証では WSL 内から Windows 側のブラウザが開きます。開かない場合は表示される URL を手動でコピーしてください

## 1.6 ターミナル操作に慣れる

以降の章の作業は、ほとんどがターミナル上で進みます。**以下のコマンドは、この先で説明なしに使います。** 初めて見るものがあれば、ここで一度手を動かしてから進んでください。

| コマンド | 用途 |
|---|---|
| `pwd` | 今いるディレクトリを表示する |
| `ls` / `ls -la` | ファイル一覧（`-a` で隠しファイル、`-l` で詳細） |
| `cd` | ディレクトリを移動する |
| `mkdir` / `mkdir -p` | ディレクトリを作る（`-p` で親も同時に） |
| `rm` / `rm -rf` | 削除する |
| `cp` / `mv` | コピー / 移動・リネーム |
| `cat` / `less` | ファイルの内容を見る |

記法もいくつか使います。

| 記法 | 意味 | 例 |
|---|---|---|
| `~` | 自分のホームディレクトリ | `cd ~` |
| `&&` | 前のコマンドが成功したら次を実行する | `cd .. && ls` |
| `>` | コマンドの出力をファイルに書く（**上書きされます**） | `echo "24" > .nvmrc` |
| `$(...)` | 中のコマンドの実行結果をその場に埋め込む | `cd $(ghq root)` |

`pwd` で今いる場所が分かり、`ls -a` で隠しファイルまで見え、`cd` で目的のディレクトリに移動できれば十分です。

**つまずきポイント**

> [!TIP]
> - `rm -rf` に確認はありません。特にホームディレクトリ直下で実行するときは、パスを2回読んでから Enter を押してください
> - ドットで始まるファイル（`.bashrc`、`.nvmrc`、`.env`）は `ls` では表示されません。`ls -a` を使ってください
> - Tab キーでパスが補完されます。手で打つよりタイプミスが減ります

## 1.7 任意) ghq

リポジトリを `~/ghq/github.com/{ユーザー名}/{リポジトリ名}` という規則的なパスに配置してくれるツールです。リポジトリが増えてくると、どこにクローンしたか分からなくなる問題を解消できます。

インストール方法は以下のリンクを参照してください。

https://github.com/x-motemen/ghq#installation

`ghq get <リポジトリURL>` でクローンでき、`ghq list` に表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - 導入は必須ではありません。この記事で作るのは1リポジトリだけなので、恩恵を感じるのは他のプロジェクトを扱い始めてからです
> - `fzf` と組み合わせると、一覧から絞り込んでリポジトリに移動できます。[9.1](09_devtools.md#91-ghq--fzf-でリポジトリを移動する) で扱います

## 1.8 リポジトリと workspace を作る

フロントエンドとバックエンドを1つのリポジトリで管理します。npm workspaces を使うことで、依存のインストールを一度で済ませ、[6章](06_api-integration.md)でフロントからバックエンドの型を参照できるようにします。

GitHub の Web UI から新規リポジトリを作成します。以下のリンクを開いてください。

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

`git log` に初回コミットが表示され、`ls -a` で `.gitignore` と `README.md` が確認できれば成功です。

**つまずきポイント**

> [!TIP]
> - **クローン先は Linux 側（`~/` 配下）にしてください。** `/mnt/c/` 配下に置くとファイルアクセスが極端に遅くなります（[1.1](#11-wsl2-ubuntu) 参照）
> - [1.5](#15-gh-github-cli) で `gh auth login` を済ませていれば、HTTPS でのクローンとプッシュに認証情報の入力は不要です。求められる場合は `gh auth status` で認証状態を確認してください
> - Visibility を Private にしていますが、これは後述する `package.json` の `"private": true` とは無関係の設定です。前者は「GitHub 上で他人から見えるか」、後者は「npm に公開できるか」の話です

### 参照用リポジトリを登録する

このチュートリアルの完成コードを、`tutorial` という名前で登録しておきます。**詰まったときに、自分のコードと完成形の差分をその場で見られるようにするため**です（[0章](00_introduction.md#進め方)）。

```bash
git remote add -t 'chapter-*' -t main tutorial https://github.com/m1m0zzz/web-dev-tutorial-2026.git
git fetch tutorial
```

`git branch -r` に `tutorial/chapter-01` 〜 `tutorial/chapter-08` と `tutorial/main` が並べば成功です。使うのは、詰まったときと答え合わせのときです。

```bash
git diff tutorial/chapter-04 -- apps/api/src          # 4章の完成形との差分
git show tutorial/chapter-04:apps/api/src/index.ts    # 完成形をそのまま読む
git show tutorial/main:docs/03_backend.md             # 記事そのものを手元で読む
```

**つまずきポイント**

> [!TIP]
> - **`-t 'chapter-*' -t main` は、取ってくるブランチを絞る指定です。** 付けないと、依存を自動更新する仕組み（Renovate）の作業ブランチまで手元に来ます
> - **`git push` の宛先は `origin`（自分のリポジトリ）のままです。** `tutorial` には書き込み権限がないので、誤って push しても失敗するだけです
> - `git branch` の表示は変わりません。増えるのは `git branch -r`（リモート追跡ブランチの一覧）だけです
> - ここで登録しなくても、あとから同じコマンドを実行すれば足せます

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

**`"private": true` を付けます。** これが無いと `npm publish` を誤って実行でき、Private リポジトリのコードが npm に公開されてしまいます。npm workspaces 自体は private でなくても動きますが、**公開する予定のないパッケージには常に付けておくのが安全です。**

**この指定はルートのパッケージにしか効きません。** `apps/web` と `apps/api` にも、それぞれ個別に必要です（[2.1](02_frontend.md#21-npm-create-vitelatest)、[3.2](03_backend.md#32-npm-create-honolatest) で確認します）。

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

## 1.9 任意) Claude Code / Codex

ターミナル上で動くコーディングエージェントです。コードベースを読んだうえで、実装やリファクタリング、調査を任せられます。以降の章で、分からないことを聞く相手として使えます。

**Claude Code（Anthropic）と Codex（OpenAI）のどちらでも構いません。** できることはほぼ同じで、この記事はどちらかに依存しません。両方入れて使い分けても構いません。

**扱うこと**

- インストールと認証
- `AGENTS.md` によるプロジェクト固有の指示
- 権限の扱い方

どちらも WSL のターミナルで実行します（Windows 側ではなく、WSL の中に入れます）。

**Claude Code**

インストール方法は以下のリンクを参照してください。

https://code.claude.com/docs/en/setup

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

`claude --version` がバージョンを表示し、`claude doctor` が設定の診断結果を表示すれば成功です。プロジェクトのディレクトリで `claude` を実行すると、対話セッションが始まります。

**Codex**

インストール方法は以下のリンクを参照してください。

https://developers.openai.com/codex/cli

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

`codex --version` がバージョンを表示すれば成功です。プロジェクトのディレクトリで `codex` を実行すると対話セッションが始まり、初回はサインインを求められます。`codex doctor` で、認証や設定の状態をまとめて確認できます。

**プロジェクト固有の指示**

どちらもリポジトリのルートに置いた **`AGENTS.md`** を読み、そこに書いた指示に従います。「このプロジェクトではテストを `npm test -w apps/web` で走らせる」といった、毎回説明したくないことをここに書いておきます。

**まず `AGENTS.md` を作ります。** 内容は自分の言葉で構いません。この時点なら、たとえばこの程度です。

```markdown
# AGENTS.md

Web アプリ開発のチュートリアルを進めるためのリポジトリです。

- 指示は日本語で行います
- npm workspaces を使っています。`npm install` とスクリプトの実行は、常にリポジトリのルートで行ってください（例: `npm run dev -w apps/web`）
- 分からないことがあるときは、コードを書き換える前に、まず原因の切り分けを手伝ってください
```

**中身は、詰まったことがあるたびに足していくものです。** 最初から完璧に書く必要はありません。

Claude Code は歴史的に `CLAUDE.md` という名前を使っており、どちらも読みます。**実体を `AGENTS.md` にして、`CLAUDE.md` はそのシンボリックリンクにしておくと、内容が二重管理になりません。**

```bash
ln -s AGENTS.md CLAUDE.md
```

**`ln -s` は、リンク先が存在しなくてもエラーになりません。** `AGENTS.md` を作る前に実行すると、どこも指していないリンクだけができます。`cat CLAUDE.md` で `AGENTS.md` の中身が表示されれば成功です。

作ったら2つともコミットしておきます。

```bash
git add AGENTS.md CLAUDE.md
git commit -m "chore: add AGENTS.md"
```

**権限の扱い**

エージェントは、ファイルの書き換えやコマンドの実行を、その都度確認してから行います。**最初のうちは、この確認を省略する設定にしないでください。** 何が起きたか分からないまま、コードが書き換わっている状態になります。

どちらの製品も、変更は Git の作業ツリーに対して行われます。**`git diff` で内容を確認してからコミットする**という手順を挟めば、意図しない変更はコミット前に気づけます。

**つまずきポイント**

> [!TIP]
> - **Claude Code の利用には Pro / Max / Team / Enterprise / Console のいずれかのアカウントが必要です。** 無料の Claude.ai プランには含まれません
> - **Codex は無料プランでも使えます。** 公式のプラン表では ChatGPT Free / Go / Plus / Pro / Business / Edu / Enterprise に含まれるとされています（使用量の上限はプランごとに違います）。API キーで使うこともできます
> - どちらも初回の実行時にブラウザでのログインを求められます
> - npm でグローバルインストールする方法もありますが、**`sudo npm install -g` は使わないでください**（権限の問題が起きます）
> - **更新の方法は製品によって違います。** Claude Code のネイティブ版はバックグラウンドで自動更新されます。Codex は公式の手順に従ってください（インストールと同じスクリプトを実行し直す形です）
> - **生成されたコードをそのままコミットしないでください。** この記事の目的は、動くコードを手に入れることではなく、動かないときに何を見ればいいかが分かるようになることです

**次の章**: [2 React でフロントエンドを作る](02_frontend.md)
