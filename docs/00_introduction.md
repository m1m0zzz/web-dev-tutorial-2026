# イントロダクション

このチュートリアルでは、フロントエンドに始まり、バックエンド、そして、フロントエンドからバックエンドAPIを呼ぶことで、webアプリ開発を体系的に学びます。

ハンズオン形式で実際に手を動かしながら学んでいきます。

**最終的には 認証付きの公開メモアプリを Cloudflare にデプロイ** します。

執筆の一部に Claude を使用しています。

## この記事について

### 想定読者

- プログラミングの経験はあるが、Web / JavaScript のエコシステムは初めて
- TypeScript と JavaScript は少し触ったことがある程度

### 前提環境

Windows + WSL2 (Ubuntu) を前提としています。macOS / Linux を使っている場合は [1.1](01_setup.md#11-wsl2-ubuntu) を読み飛ばし、[1.3](01_setup.md#13-nvm) から始めてください。

### 進め方

記事本文には、初出の概念は全文を、そこからの変更は差分を載せています。完成コードはリポジトリを参照してください。

https://github.com/m1m0zzz/web-dev-tutorial-2026

各章には、その章を終えた時点のコードのブランチが対応しています。途中から始めたい場合や、詰まったときに正解を確認したい場合は、対応するブランチを参照してください。`main` は最新の状態です。

| 章 | ブランチ |
|---|---|
| 2 React でフロントエンドを作る | `chapter-02` |
| 3 Hono でバックエンドを作る | `chapter-03` |
| 4 テストを書く | `chapter-04` |
| 5 デプロイする | `chapter-05` |
| 6 フロントから API を呼ぶ | `chapter-06` |
| 7 機能を拡張する | `chapter-07` |
| 8 E2E テストを行う | `chapter-08` |

[1章](01_setup.md) と [9章](09_devtools.md) はコードの変更はないので、対応するブランチはありません。

途中の章から始める場合は、そのブランチを checkout してから読み進めてください。

```bash
git clone https://github.com/m1m0zzz/web-dev-tutorial-2026.git
cd web-dev-tutorial-2026
git checkout chapter-03   # 3章を終えた時点の状態
npm install
```

## 目次

1. [環境構築](01_setup.md)
2. [React でフロントエンドを作る](02_frontend.md)
3. [Hono でバックエンドを作る](03_backend.md)
4. [テストを書く](04_test.md)
5. [デプロイする](05_deploy.md)
6. [フロントから API を呼ぶ](06_api-integration.md)
7. [機能を拡張する](07_features.md)
8. [E2E テストを行う](08_e2e.md)
9. [任意) 開発環境をさらに整える](09_devtools.md)
