FROM node:20-alpine

WORKDIR /app

# Copy root package files first (for shared dependencies)
COPY package*.json ./

# Copy service package files
COPY services/search-service/package*.json ./services/search-service/

# Install root dependencies (for shared modules)
RUN npm install --omit=dev

# Install service dependencies
WORKDIR /app/services/search-service
RUN npm install --omit=dev

# Copy shared libraries
WORKDIR /app
COPY shared ./shared

# Copy service source code
COPY services/search-service ./services/search-service

# Expose port
EXPOSE 3006

WORKDIR /app/services/search-service

# Start the application
CMD ["node", "src/index.js"]
