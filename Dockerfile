# Use the official Playwright image — it ships with Chromium + all system deps
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Make the Mapbox public token available at build time so Next.js can inline it
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

# Generate Prisma client and build Next.js
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Browsers are already installed in the base image at /ms-playwright
# Point Playwright to them so it doesn't try to download on startup
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 3000

# Run DB migration then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node_modules/.bin/next start -p ${PORT:-3000}"]
