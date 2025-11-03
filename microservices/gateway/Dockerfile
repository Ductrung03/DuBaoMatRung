FROM node:20-alpine

WORKDIR /app

# Copy root package files first (for shared dependencies)
COPY package*.json ./

# Copy gateway package files
COPY gateway/package*.json ./gateway/

# Install root dependencies (for shared modules)
RUN npm install --omit=dev

# Install gateway dependencies
WORKDIR /app/gateway
RUN npm install --omit=dev

# Copy shared libraries
WORKDIR /app
COPY shared ./shared

# Copy gateway source code
COPY gateway ./gateway

# Expose port
EXPOSE 3000

WORKDIR /app/gateway

# Start the application
CMD ["node", "src/index.js"]
