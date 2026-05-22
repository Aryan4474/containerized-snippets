# Use official Node.js LTS version on Alpine Linux for a lightweight, secure container base
FROM node:20-alpine

# Set default Node environment to production for optimal performance and security configs
ENV NODE_ENV=production

# Define working directory inside the container
WORKDIR /usr/src/app

# Copy dependency manifest files first.
# This leverages Docker's layer caching: dependencies are only re-installed if package.json or package-lock.json changes.
COPY package*.json ./

# Install only production dependencies using "npm ci" (clean install).
# This is faster and more reliable than "npm install" because it uses the exact lockfile mapping.
# We also change ownership of these files to the non-root "node" user.
RUN npm ci --only=production && npm cache clean --force

# Copy the rest of the application source code and adjust ownership
COPY --chown=node:node src/ ./src/

# Change current user to the built-in non-root "node" user for security.
# This prevents privilege escalation vulnerabilities within the container.
USER node

# Expose the port the server listens on (will be bound in docker-compose)
EXPOSE 5050

# Define container health check to let Docker know if the app server goes down or becomes unresponsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:5050/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Start the application.
# We avoid running a shell script (e.g. npm start) as it intercepts SIGTERM signals,
# which prevents Docker from shutting down the container gracefully.
CMD ["node", "src/app.js"]
