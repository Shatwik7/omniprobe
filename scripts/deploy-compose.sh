#!/usr/bin/env sh
set -eu

COMPOSE_FILE="docker-compose.deploy.yaml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing $COMPOSE_FILE in current directory"
  exit 1
fi

echo "Starting Omniprobe deploy stack using $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" up --build -d

echo "Deploy complete. Running containers:"
docker compose -f "$COMPOSE_FILE" ps
