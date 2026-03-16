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

RUN npx nest build alert-engine

FROM node:24-alpine AS prod

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /workspace/dist/apps/alert-engine ./dist/apps/alert-engine

CMD ["node", "dist/apps/alert-engine/apps/alert-engine/src/main.js"]
