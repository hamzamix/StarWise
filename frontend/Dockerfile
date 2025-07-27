# Stage 1: Build the React app with Vite
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only package files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of your source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:stable-alpine
# Copy built static files to nginx public dir
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
