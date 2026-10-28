# ==========================================
# Task Management Backend - Dockerfile
# Practical 11: Containerization with Docker
# ==========================================

FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy application source code (node_modules excluded via .dockerignore)
COPY . .

# Expose backend server port
EXPOSE 5000

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production

# Start Express server
CMD ["node", "server.js"]
