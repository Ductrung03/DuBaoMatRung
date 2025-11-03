FROM node:20-alpine

WORKDIR /app

# Copy root package files first (for shared dependencies)
COPY package*.json ./

# Copy service package files
COPY services/user-service/package*.json ./services/user-service/

# Install root dependencies (for shared modules)
RUN npm install --omit=dev

# Install service dependencies
WORKDIR /app/services/user-service
RUN npm install --omit=dev

# Copy shared libraries
WORKDIR /app
COPY shared ./shared

# Copy service source code
COPY services/user-service ./services/user-service

# Expose port
EXPOSE 3002

WORKDIR /app/services/user-service

# Start the application
CMD ["node", "src/index.js"]
