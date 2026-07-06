# Build stage: compile TypeScript -> dist/
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage: production deps + compiled output only
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# stdio MCP server: it starts and answers introspection (tools/list) with no
# secret; SPECSHIELD_API_KEY is only needed when a tool actually runs.
ENTRYPOINT ["node", "dist/index.js"]
