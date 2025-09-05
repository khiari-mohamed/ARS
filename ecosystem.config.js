module.exports = {
  apps: [{
    name: 'ars-api',
    script: 'dist/src/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: "postgresql://postgres:23044943@localhost:5432/ars_db",
      JWT_SECRET: "verySecretKey",
      DB_TYPE: "postgresql",
      AI_MICROSERVICE_URL: "http://10.34.60.63:8002",
      SERVER_URL: "http://10.34.60.63:5000",
      FRONTEND_URL: "http://10.34.60.63/ars"
    }
  }]
};