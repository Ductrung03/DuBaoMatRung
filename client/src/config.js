const config = {
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:3000"
};

// Log để debug
console.log("🔄 Đã load config với API_URL:", config.API_URL);

export default config;