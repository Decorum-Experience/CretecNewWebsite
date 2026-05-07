# ============================================================
# Stage 1: Build
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (layer cache: only re-runs
# npm ci when these files change)
COPY package.json package-lock.json ./

# Install all deps including devDependencies (vite lives there)
RUN npm ci

# Copy source files
COPY . .

# Build the static site
RUN npm run build

# ============================================================
# Stage 2: Serve
# ============================================================
FROM nginx:1.27-alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
