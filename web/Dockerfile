FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy schema and generate Prisma client
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate --schema ./prisma/schema.prisma

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client again in builder stage to be safe
RUN npx prisma generate --schema ./prisma/schema.prisma

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN groupadd --gid 1001 nodejs
RUN useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/auth.ts ./auth.ts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Startup script to ensure DB is updated
CMD ["sh", "-c", "npx prisma db push --schema ./prisma/schema.prisma && npm start"]
