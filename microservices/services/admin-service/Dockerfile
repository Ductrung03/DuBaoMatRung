FROM node:20-alpine

WORKDIR /app

# Copy root package files first (for shared dependencies)
COPY package*.json ./

# Copy service package files
COPY services/admin-service/package*.json ./services/admin-service/

# Install root dependencies (for shared modules)
RUN npm install --omit=dev

# Install service dependencies
WORKDIR /app/services/admin-service
RUN npm install --omit=dev

# Copy shared libraries
WORKDIR /app
COPY shared ./shared

# Copy service source code
COPY services/admin-service ./services/admin-service

# Expose port
EXPOSE 3005

WORKDIR /app/services/admin-service

# Start the application
CMD ["node", "src/index.js"]
