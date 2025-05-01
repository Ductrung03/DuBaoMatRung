const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { default: open } = require("open");

const hanhchinhRoutes = require("./routes/hanhchinh.route");
const shapefileRoutes = require("./routes/shapefile.route");
const importGeeUrlRoutes = require("./routes/importGeeUrl.route");
const matRungRoutes = require("./routes/matrung.route")
const dataDropdownRoutes = require("./routes/dataDropdown.routes")

require("dotenv").config();

const app = express();

// Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerOptions = require("./swaggerOptions");
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors());
app.use(express.json());

app.use("/api/import-shapefile", shapefileRoutes);
app.use("/api/import-gee-url", importGeeUrlRoutes);
app.use("/api/hanhchinh", hanhchinhRoutes);
app.use("/api/mat-rung", matRungRoutes);
app.use("/api/dropdown", dataDropdownRoutes)

app.get("/", (req, res) => {
  res.send("✅ Backend Geo API đang hoạt động");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Backend chạy tại http://localhost:${port}`);
  open(`http://localhost:${port}/api-docs`);
});
