// server/swaggerOptions.js
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Dự báo mất rừng - API Documentation",
      version: "1.0.0",
      description: "Swagger Docs cho các API lấy dữ liệu hành chính phục vụ tra cứu dự báo mất rừng.",
    },
    servers: [
      {
        url: "http://localhost:3000/api",
      },
    ],
  },
  apis: ["./routes/*.js"], // đường dẫn đến nơi viết swagger comment
};

module.exports = options;
