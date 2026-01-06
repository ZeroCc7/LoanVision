# LoanVision 部署手册

LoanVision 是一款基于 React + Node.js + SQLite 的轻量级贷款记账工具。本手册涵盖了本地开发运行和服务器生产环境部署的完整流程。

---

## 1. 环境准备

在开始之前，请确保您的机器上已安装以下软件：
- **Node.js**: 推荐使用 v18.17.0 或更高版本 (本项目已在 v18.17.1 环境下测试)。
- **npm**: 随 Node.js 一同安装。
- **PM2** (仅服务器部署需要): `npm install pm2 -g`。

---

## 2. 本地开发运行

如果您是在本地进行开发或测试，请按照以下步骤操作：

### 第一步：克隆/下载代码
将项目代码下载到本地目录。

### 第二步：安装依赖
分别安装前端和后端的依赖包：

```bash
# 安装根目录依赖（主要用于脚本管理）
npm install

# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 第三步：配置环境变量
后端 `server` 目录下包含一个 `.env` 文件，确保其内容正确：
```env
PORT=5000
JWT_SECRET=your_secret_key_here
DB_PATH=./src/db/loanvision.db
NODE_ENV=development
```

### 第四步：启动项目
您可以分别启动前端和后端，或者使用根目录定义的便捷脚本：

- **同时启动前端和后端 (推荐)**:
  在项目根目录下打开两个终端窗口：
  - 终端 1 (后端): `npm run server`
  - 终端 2 (前端): `npm run client`

项目启动后：
- 前端访问地址: `http://localhost:5173`
- 后端 API 地址: `http://localhost:5000`

### 第五步：创建初始用户
如果您关闭了前端注册功能，或者想通过命令行创建用户：
```bash
npm run create-user
```
按提示输入用户名和密码即可。

---

## 3. 服务器部署流程 (单体部署)

本项目支持单体部署模式，即后端 Express 服务同时托管前端生成的静态文件。

### 第一步：前端打包
在项目根目录下执行打包命令：
```bash
npm run build
```
这将在 `client/dist` 目录下生成静态文件。

### 第二步：服务器环境配置
1. 将整个项目上传至服务器。
2. 在服务器上执行 `npm install` 安装必要依赖。
3. 确保服务器端的 `server/.env` 文件配置如下：
   ```env
   PORT=5000
   JWT_SECRET=your_production_secret
   DB_PATH=./src/db/loanvision.db
   NODE_ENV=production
   ```

### 第三步：使用 PM2 启动服务
根目录下已配置 `ecosystem.config.js`，直接运行：
```bash
pm2 start ecosystem.config.js --env production
```

### 第四步：保存 PM2 状态 (可选)
为了确保服务器重启后服务能自动恢复：
```bash
pm2 save
pm2 startup
```

---

## 4. 常见问题排查

### 1. 数据库权限
由于使用了 SQLite，请确保运行服务的用户对 `server/src/db/` 目录及其中的 `.db` 文件拥有读写权限。

### 2. 端口占用
如果 5000 端口已被占用，请修改 `server/.env` 中的 `PORT` 变量，并同步更新前端 `client/src/api/axios.ts` 中的 `baseURL`（如果是生产环境，通常后端会自动处理）。

### 3. 登录失效/无法获取数据
- 检查后端服务是否崩溃。
- 检查浏览器 `localStorage` 是否被禁用。
- 如果服务器重启或数据库重置，请清除浏览器缓存并重新登录。

---

## 5. 技术栈概览
- **前端**: React 18, Vite, Ant Design 5.x, Recharts.
- **后端**: Node.js, Express, SQLite (better-sqlite3).
- **认证**: JWT (JSON Web Token).
