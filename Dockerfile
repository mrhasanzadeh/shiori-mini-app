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

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
