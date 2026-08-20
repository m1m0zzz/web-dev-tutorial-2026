#!/usr/bin/env bash
#
# 執筆者向け: main の履歴から章ブランチ (chapter-02 … chapter-08) を付け直す。
#
# この記事は「1章 = 1コミット」の直線的な履歴で、章ブランチはその途中を指しているだけ。
# 前の章を直したあと（git rebase -i --root で該当コミットを修正したあと）に実行すると、
# 各章ブランチを対応するコミットへ移動する。
#
#   ./_writing/sync-chapters.sh          # ローカルのブランチを付け直すだけ
#   ./_writing/sync-chapters.sh --push   # そのまま force push する
#
# 運用の詳細は _writing/README.md を参照。
#
# 章のコミットは、コミットメッセージの "N章" で見つける。
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CHAPTERS=(2 3 4 5 6 7 8)
PUSH=false
[ "${1:-}" = "--push" ] && PUSH=true

if [ -n "$(git status --porcelain)" ]; then
  echo "作業ツリーに変更があります。コミットするか stash してから実行してください。" >&2
  exit 1
fi

branches=()
changed=false

for n in "${CHAPTERS[@]}"; do
  branch=$(printf 'chapter-%02d' "$n")

  # main の履歴から "N章" を含むコミットを探す（1件でなければエラー）
  matches=$(git log main --format='%H %s' | grep -E ": ${n}章 " || true)
  count=$(printf '%s' "$matches" | grep -c . || true)

  if [ "$count" -ne 1 ]; then
    echo "${branch}: main に \"${n}章\" のコミットが ${count} 件見つかりました（1件である必要があります）" >&2
    exit 1
  fi

  sha=$(printf '%s' "$matches" | cut -d' ' -f1)
  old=$(git rev-parse --verify --quiet "$branch" || true)

  if [ "$old" = "$sha" ]; then
    printf '%s: 変更なし (%s)\n' "$branch" "$(git rev-parse --short "$sha")"
  else
    git branch -f "$branch" "$sha"
    printf '%s: %s -> %s\n' "$branch" \
      "$([ -n "$old" ] && git rev-parse --short "$old" || echo なし)" \
      "$(git rev-parse --short "$sha")"
    changed=true
  fi

  branches+=("$branch")
done

if [ "$PUSH" = true ]; then
  echo
  git push --force-with-lease origin main "${branches[@]}"
  echo
  echo "push しました。GitHub Actions の CI を workflow_dispatch で実行し、"
  echo "各章ブランチが壊れていないか確認してください。"
elif [ "$changed" = true ]; then
  echo
  echo "ローカルのブランチを付け直しました。反映するには --push を付けて実行してください。"
fi
