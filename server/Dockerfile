FROM node:22

# Cài đặt các công cụ PostgreSQL và PostGIS (bao gồm shp2pgsql)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    postgis \
    && apt-get clean

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json trước để tận dụng caching
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Sao chép toàn bộ mã nguồn
COPY . .

# Khởi động ứng dụng
CMD ["npm", "start"]