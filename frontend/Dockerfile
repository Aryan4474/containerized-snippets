# Stage 1: Build the React Application
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve the Built Static Assets using Nginx
FROM nginx:stable-alpine

# Copy built files from the build stage to Nginx default public path
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Overwrite default Nginx configuration with our custom SPA router config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
