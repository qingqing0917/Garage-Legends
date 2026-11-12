#!/bin/zsh
cd -- "$(dirname -- "$0")"
if command -v node >/dev/null 2>&1; then
  node server.mjs --open
elif [[ -x /opt/homebrew/bin/node ]]; then
  /opt/homebrew/bin/node server.mjs --open
elif [[ -x /usr/local/bin/node ]]; then
  /usr/local/bin/node server.mjs --open
else
  print '需要先安装 Node.js 22.12 或更新版本：https://nodejs.org/'
  read '?按回车关闭。'
fi
