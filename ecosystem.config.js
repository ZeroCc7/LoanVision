// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'loan-vision',
      script: 'src/index.js',
      cwd: './server',
      instances: 1,           // 强制单实例
      exec_mode: 'fork',      // 必须使用 fork 模式，SQLite 不支持 cluster
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};