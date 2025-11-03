FROM node:20-alpine

WORKDIR /app

# Copy root package files first (for shared dependencies)
COPY package*.json ./

# Copy service package files
COPY services/report-service/package*.json ./services/report-service/

# Install root dependencies (for shared modules)
RUN npm install --omit=dev

# Install service dependencies
WORKDIR /app/services/report-service
RUN npm install --omit=dev

# Copy shared libraries
WORKDIR /app
COPY shared ./shared

# Copy service source code
COPY services/report-service ./services/report-service

# Expose port
EXPOSE 3004

WORKDIR /app/services/report-service

# Start the application
CMD ["node", "src/index.js"]
