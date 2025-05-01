require("dotenv").config();

module.exports = {
  db: {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  },
  geoserver: {
    user: process.env.GEOSERVER_USER,
    pass: process.env.GEOSERVER_PASS,
  },
};
