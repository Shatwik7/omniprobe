FROM node:24-alpine AS build

WORKDIR /workspace

# Install dependencies once for the build.
COPY package.json package-lock.json ./
RUN npm ci

# Copy monorepo sources required for Nest build.
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY apps ./apps
COPY libs ./libs

RUN npx nest build ingest-service

FROM node:24-alpine AS prod

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /workspace/dist/apps/ingest-service ./dist/apps/ingest-service

CMD ["node", "dist/apps/ingest-service/apps/ingest-service/src/main.js"]
