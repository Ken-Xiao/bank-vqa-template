#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f ".env" ]; then
  echo "Missing .env. Create it from .env.example and fill DEEPSEEK_API_KEY first."
  echo "Example: cp .env.example .env"
  exit 1
fi

if grep -Eq '^DEEPSEEK_API_KEY=($|sk-your-deepseek-api-key)' ".env"; then
  echo "DEEPSEEK_API_KEY is still empty or using the example placeholder."
  echo "Please edit .env and paste your real DeepSeek API key."
  exit 1
fi

node server/deepseek-commentary-proxy.js
