# Search Vailable — production image
# Builds the React client + the Express server bundle, then runs the server
# which serves both the static frontend and the /api routes on one port.
FROM node:22-bookworm-slim

WORKDIR /app

# Install all dependencies (dev deps are needed for the Vite build and because
# the bundled server imports Vite at runtime for dev-mode detection).
COPY package*.json ./
RUN npm ci --include=dev

# Copy the source and build
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

# Runtime data (users, sessions, workspaces, payments, subscriptions) is written
# here. Mount a persistent volume at /app/data in production.
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
