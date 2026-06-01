FROM node:20-alpine


ENV NODE_ENV=production


WORKDIR /usr/src/app


COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --chown=node:node src/ ./src/


USER node


EXPOSE 5050


HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:5050/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"


CMD ["node", "src/app.js"]
