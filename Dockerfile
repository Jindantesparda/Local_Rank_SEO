# Search Vailable — production image
# Builds the React client + the Express server bundle, then runs the server
# which serves both the static frontend and the /api routes on one port.
FROM node:24-bookworm-slim

WORKDIR /app

# Install everything (dev deps are needed to run the Vite/TS build).
COPY package*.json ./
RUN npm ci --include=dev

# Copy the source and build
COPY . .
# Vite is only imported lazily in dev mode, so the dev toolchain can be pruned
# after the build — the runtime image keeps express, cheerio and dotenv only.
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

# Runtime data lives here as a single SQLite database (searchvailable.db) plus
# its WAL sidecar files. Mount a persistent volume at /app/data in production —
# this is now the only thing that needs to survive a redeploy.
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
