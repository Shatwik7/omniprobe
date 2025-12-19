# -----------------------------
# Build stage
# -----------------------------
FROM node:24-alpine AS nest-build

WORKDIR /workspace

# Copy dependency files first (better caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy EVERYTHING needed for Nest build
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY apps ./apps
COPY libs ./libs

# Build only management-api
RUN npx nest build management-api

# Run esbuild bundling
RUN node apps/management-api/build.js


# -----------------------------
# Production stage (minimal)
# -----------------------------
FROM gcr.io/distroless/nodejs24-debian12 AS prod

WORKDIR /app

COPY --from=nest-build /workspace/apps/management-api/build/main.js ./main.js

EXPOSE 3000
CMD ["main.js"]
