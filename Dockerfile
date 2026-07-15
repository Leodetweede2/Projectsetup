# Production image for Fly.io.
#
# We deliberately keep a single, full-dependency Debian image (rather than a
# trimmed Next.js "standalone" build) so that the same image can also run
# `prisma migrate deploy` (release_command) and `prisma db seed` — both of
# which need the Prisma CLI, the migration files, and the seed script's
# TypeScript sources. Reliability over image size.

FROM node:20-bookworm-slim

# OpenSSL is required by the Prisma query engine; ca-certificates for TLS to
# Supabase.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies first for better layer caching. We need dev deps to
# build, so include them.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy the rest of the source and build. Dummy DB URLs are provided only for
# the build step (Next collects page data / instantiates the Prisma client);
# real values are injected at runtime via Fly secrets and override these.
COPY . .
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build" \
    npm run build

# Runtime configuration. Fly secrets/env override these at run time.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

# `next start` reads PORT and HOSTNAME from the environment.
CMD ["npm", "run", "start"]
