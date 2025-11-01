# Du Bao Mat Rung - Rain Forecast System

Hệ thống dự báo mất rừng sử dụng GIS và microservices.

## 🐳 Docker Deployment (Recommended)

### Prerequisites

- Docker Desktop: https://www.docker.com/products/docker-desktop

### Quick Start

```powershell
# 1. Clone repository
git clone <repository-url>
cd DuBaoMatRung

# 2. Setup environment
Copy-Item .env.docker .env
notepad .env  # Edit DB_PASSWORD and JWT_SECRET

# 3. Deploy
.\deploy-docker.ps1 -FirstTime
```

### Update Code

```powershell
.\deploy-docker.ps1
```

### View Logs

```powershell
docker-compose logs -f
```

📖 **Full documentation**: See [DOCKER_SETUP.md](DOCKER_SETUP.md)

---

## 📁 Project Structure

```
DuBaoMatRung/
├── microservices/           # Backend services
│   ├── gateway/            # API Gateway
│   └── services/           # Microservices
│       ├── auth-service/   # Authentication
│       ├── user-service/   # User management
│       ├── gis-service/    # GIS operations
│       ├── report-service/ # Reports
│       ├── admin-service/  # Admin functions
│       ├── search-service/ # Search
│       └── mapserver-service/
├── client/                 # React frontend
├── docker-compose.yml      # Docker configuration
└── deploy-docker.ps1       # Deployment script
```

---

## 🚀 Services

After deployment, access:

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api-docs

---

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- PostgreSQL + PostGIS
- MongoDB (Logging)
- Redis (Cache)
- JWT Authentication

### Frontend
- React 19
- Vite
- TailwindCSS
- Leaflet (Maps)
- Axios

### Infrastructure
- Docker + Docker Compose
- Nginx (Frontend)
- PM2 (Optional)

---

## 📊 Databases

Auto-created by Docker:

- **PostgreSQL** (port 5432) - Auth & User data
- **PostGIS** (port 5433) - GIS data with spatial extensions
- **MongoDB** (port 27017) - Logging
- **Redis** (port 6379) - Cache

---

## 🔧 Development

### Local Development (without Docker)

Each service can run independently:

```bash
# Backend service
cd microservices/services/auth-service
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev
```

### Environment Variables

See `.env.docker` for template.

---

## 📝 API Documentation

Access Swagger UI at: http://localhost:3000/api-docs

---

## 🆘 Troubleshooting

### Port conflicts
```powershell
docker-compose down
netstat -ano | findstr "3000"  # Find conflicting process
```

### View service logs
```powershell
docker-compose logs -f [service-name]
```

### Rebuild everything
```powershell
.\deploy-docker.ps1 -Rebuild
```

### Stop all services
```powershell
.\deploy-docker.ps1 -Stop
```

---

## 📄 License

[Your License]

---

## 👥 Contributors

[Your Team]
