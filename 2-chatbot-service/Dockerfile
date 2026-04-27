FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN chown -R node:node /app

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4001/health >/dev/null || exit 1

USER node

CMD ["node", "src/index.js"]
