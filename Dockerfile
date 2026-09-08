# syntax=docker/dockerfile:1

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# VITE_* variables are baked into the static bundle at build time, not read at container runtime —
# so the API URL must be supplied as a build argument, e.g.:
#   docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 \
#                --build-arg VITE_APP_NAME="Project & Task Management" \
#                -t ptm-web .
ARG VITE_API_BASE_URL
ARG VITE_APP_NAME="Project & Task Management"
ARG VITE_ENABLE_DEVTOOLS=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_ENABLE_DEVTOOLS=$VITE_ENABLE_DEVTOOLS

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime ----
# nginxinc/nginx-unprivileged runs as a non-root user out of the box, with its pid file, cache
# dirs, and temp paths all pre-configured to be writable by that user (plain nginx:alpine's /run
# is a tmpfs recreated fresh at container start, so a build-time `chown` there has no effect and
# nginx fails to write its pid file — this image exists specifically to avoid that class of bug).
FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
