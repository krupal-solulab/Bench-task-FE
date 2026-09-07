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
FROM nginx:alpine AS runtime

RUN addgroup -S webapp && adduser -S webapp -G webapp \
    && chown -R webapp:webapp /var/cache/nginx /var/run

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

USER webapp
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
