FROM node:20-alpine

WORKDIR /app

# Copy root package files first (for shared dependencies)
COPY package*.json ./

# Copy service package files
COPY services/gis-service/package*.json ./services/gis-service/

# Install root dependencies (for shared modules)
RUN npm install --omit=dev

# Install service dependencies
WORKDIR /app/services/gis-service
RUN npm install --omit=dev

# Copy shared libraries
WORKDIR /app
COPY shared ./shared

# Copy service source code
COPY services/gis-service ./services/gis-service

# Expose port
EXPOSE 3003

WORKDIR /app/services/gis-service

# Start the application
CMD ["node", "src/index.js"]
