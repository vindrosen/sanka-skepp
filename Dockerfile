# ---------- Build ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Vite bakar in VITE_*-variablerna vid bygget, inte vid körningen, så de måste
# vara satta innan `npm run build`. VITE_SITE_URL bär både origin och sub-path;
# vite.config.ts härleder Vites `base` ur dess pathname.
ARG VITE_SITE_URL=""
ARG VITE_UMAMI_URL=""
ARG VITE_UMAMI_WEBSITE_ID=""
ENV VITE_SITE_URL=${VITE_SITE_URL} \
    VITE_UMAMI_URL=${VITE_UMAMI_URL} \
    VITE_UMAMI_WEBSITE_ID=${VITE_UMAMI_WEBSITE_ID}

RUN npm run build

# ---------- Runtime ----------
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
