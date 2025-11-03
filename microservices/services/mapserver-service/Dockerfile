FROM node:20-bullseye-slim

# Install MapServer and dependencies from Debian repos
RUN apt-get update && apt-get install -y \
    cgi-mapserver \
    mapserver-bin \
    gdal-bin \
    libgdal-dev \
    libproj-dev \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files first (for shared dependencies)
COPY package*.json ./

# Copy service package files
COPY services/mapserver-service/package*.json ./services/mapserver-service/

# Install root dependencies (for shared modules)
RUN npm install --omit=dev

# Install service dependencies
WORKDIR /app/services/mapserver-service
RUN npm install --omit=dev

# Copy shared libraries
WORKDIR /app
COPY shared ./shared

# Copy service source code
COPY services/mapserver-service ./services/mapserver-service

# Expose port
EXPOSE 3007

WORKDIR /app/services/mapserver-service

# Start the application
CMD ["node", "src/index.js"]
