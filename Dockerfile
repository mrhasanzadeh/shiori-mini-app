# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_SHIORI_API_URL
ARG VITE_TELEGRAM_BOT_USERNAME
ENV VITE_SHIORI_API_URL=$VITE_SHIORI_API_URL
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:api

FROM nginx:1.27-alpine AS runner

COPY <<'NGINX' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
