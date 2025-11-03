FROM node:20-alpine

WORKDIR /app

# Copy root package files first (for shared dependencies)
COPY package*.json ./

# Copy service package files
COPY services/auth-service/package*.json ./services/auth-service/

# Install root dependencies (for shared modules)
RUN npm install --omit=dev

# Install service dependencies
WORKDIR /app/services/auth-service
RUN npm install --omit=dev

# Copy shared libraries
WORKDIR /app
COPY shared ./shared

# Copy service source code
COPY services/auth-service ./services/auth-service

# Generate Prisma Client
WORKDIR /app/services/auth-service
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "src/index.js"]
