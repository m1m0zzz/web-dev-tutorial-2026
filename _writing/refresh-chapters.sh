#!/usr/bin/env bash
#
# 執筆者向け: main の先端にある依存のバージョンを、章のコミットまでさかのぼって当てる。
#
# Renovate の更新は main の先端にだけ入り、章ブランチは古いバージョンのまま残る。
# 記事に書いたバージョンが上がったとき（automerge されない更新を記事に反映したとき）に実行する。
#
#   ./_writing/refresh-chapters.sh   # 書き換えた履歴を refresh ブランチに作る（main は書き換えない）
#
# main を first-parent で根元からたどり、各コミットを次のように作り直す。
#
#   1. package.json（ルート / apps/*）の依存を、先端と同じバージョンにする。
#      ^ の有無はそのコミットの書き方のまま残す
#   2. package-lock.json を、先端の lockfile を元に npm install --package-lock-only で作り直す。
#      そのコミットで要らないパッケージは落ち、残るものは先端と同じバージョンになる
#   3. 1つ前のコミットと差分が無くなったものは落とす。npm の依存だけを上げた
#      Renovate のコミットがこれにあたる。merge コミットは1つのコミットとして扱う
#
# 最後に、refresh の先端のツリーが main と一致することを確かめる。一致しなければ何も作らない。
# 運用の詳細は _writing/README.md を参照。
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "作業ツリーに変更があります。コミットするか stash してから実行してください。" >&2
  exit 1
fi

if git rev-parse --verify --quiet refresh >/dev/null; then
  echo "refresh ブランチが既にあります。git branch -D refresh で消してから実行してください。" >&2
  exit 1
fi

tip=$(git rev-parse main)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# 書き換え用のインデックス。作業ツリーと本来のインデックスには触れない
export GIT_INDEX_FILE="$work/index"

# 依存の宣言があるファイル。apps/* はコミットごとに存在するものだけを扱う
manifests() {
  git ls-tree -r --name-only "$1" -- package.json apps | grep -E '^(package\.json|apps/[^/]+/package\.json)$' || true
}

mkdir -p "$work/tip"
for f in $(manifests "$tip") package-lock.json; do
  mkdir -p "$work/tip/$(dirname "$f")"
  git show "$tip:$f" >"$work/tip/$f"
done

# 1 を行う。先端に同じ名前の依存があれば、そのバージョンに置き換える
apply_versions() {
  node - "$work/tip" "$1" <<'EOF'
const fs = require('fs')
const path = require('path')
const [tipDir, dir] = process.argv.slice(2)
const sections = ['dependencies', 'devDependencies']
const semver = /^([\^~]?)(\d+\.\d+\.\d+\S*)$/

for (const file of ['package.json', ...fs.readdirSync(path.join(dir, 'apps')).map((d) => `apps/${d}/package.json`)]) {
  const target = path.join(dir, file)
  const source = path.join(tipDir, file)
  if (!fs.existsSync(target) || !fs.existsSync(source)) continue
  const pkg = JSON.parse(fs.readFileSync(target, 'utf8'))
  const tipPkg = JSON.parse(fs.readFileSync(source, 'utf8'))
  let changed = false
  for (const s of sections) {
    for (const [name, spec] of Object.entries(pkg[s] ?? {})) {
      const tipSpec = sections.map((t) => tipPkg[t]?.[name]).find(Boolean)
      const own = semver.exec(spec)
      const latest = tipSpec && semver.exec(tipSpec)
      if (!own || !latest) continue
      const next = own[1] + latest[2]
      if (next !== spec) {
        pkg[s][name] = next
        changed = true
      }
    }
  }
  if (changed) fs.writeFileSync(target, JSON.stringify(pkg, null, 2) + '\n')
}
EOF
}

prev_tree=
prev_commit=
prev_key=
kept=0
dropped=0

for c in $(git rev-list --reverse --first-parent main); do
  git read-tree "$c"
  files=$(manifests "$c")

  if [ -n "$files" ]; then
    dir="$work/c"
    rm -rf "$dir" && mkdir -p "$dir/apps"
    for f in $files; do
      mkdir -p "$dir/$(dirname "$f")"
      git show "$c:$f" >"$dir/$f"
    done
    apply_versions "$dir"

    # 2 を行う。宣言が前のコミットと同じなら、前に作った lockfile をそのまま使う
    if git cat-file -e "$c:package-lock.json" 2>/dev/null; then
      key=$(cd "$dir" && cat $files | sha1sum | cut -d' ' -f1)
      if [ "$key" != "$prev_key" ]; then
        cp "$work/tip/package-lock.json" "$dir/package-lock.json"
        (cd "$dir" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund >"$work/npm.log" 2>&1) || {
          cat "$work/npm.log" >&2
          echo "$(git log -1 --format='%h %s' "$c"): lockfile を作り直せませんでした" >&2
          exit 1
        }
        cp "$dir/package-lock.json" "$work/lock"
        prev_key=$key
      fi
      git update-index --cacheinfo "100644,$(git hash-object -w "$work/lock"),package-lock.json"
    fi

    for f in $files; do
      git update-index --cacheinfo "100644,$(git hash-object -w "$dir/$f"),$f"
    done
  fi

  tree=$(git write-tree)

  # 3 を行う
  if [ "$tree" = "$prev_tree" ]; then
    dropped=$((dropped + 1))
    continue
  fi

  parent=()
  [ -n "$prev_commit" ] && parent=(-p "$prev_commit")
  export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_AUTHOR_DATE GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL GIT_COMMITTER_DATE
  GIT_AUTHOR_NAME=$(git log -1 --format=%an "$c")
  GIT_AUTHOR_EMAIL=$(git log -1 --format=%ae "$c")
  GIT_AUTHOR_DATE=$(git log -1 --format=%ad --date=raw "$c")
  GIT_COMMITTER_NAME=$(git log -1 --format=%cn "$c")
  GIT_COMMITTER_EMAIL=$(git log -1 --format=%ce "$c")
  GIT_COMMITTER_DATE=$(git log -1 --format=%cd --date=raw "$c")
  prev_commit=$(git cat-file commit "$c" | sed '1,/^$/d' | git commit-tree "$tree" "${parent[@]}")
  prev_tree=$tree
  kept=$((kept + 1))
done

if [ "$(git rev-parse "$tip^{tree}")" != "$prev_tree" ]; then
  echo "書き換えた先端のツリーが main と一致しません。refresh ブランチは作りません。" >&2
  git diff --stat "$tip" "$prev_commit" >&2
  exit 1
fi

git branch refresh "$prev_commit"

cat <<EOF
refresh ブランチを作りました（残したコミット ${kept} 件、落としたコミット ${dropped} 件）。
先端のツリーは main と一致しています。章ごとの差分を確認してから、次を実行してください。

  git branch -f main refresh      # main 以外のブランチにいるとき。main にいるなら git reset --hard refresh
  ./_writing/sync-chapters.sh --push
  git branch -D refresh
EOF
