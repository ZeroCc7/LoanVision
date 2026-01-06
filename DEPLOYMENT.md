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

## 3. 生产环境部署 (基于 Git)

本项目支持单体部署模式，即后端 Express 服务同时托管前端生成的静态文件。建议使用 Git 进行版本管理和部署。

### 第一步：克隆项目
在服务器目标目录下执行：
```bash
git clone <项目仓库地址>
cd LoanVision
```

### 第二步：安装依赖
分别安装根目录、后端和前端的依赖包：
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 第三步：配置环境变量
1. 在 `server` 目录下创建 `.env` 文件：
   ```bash
   touch server/.env
   ```
2. 编辑 `server/.env`，确保生产环境配置正确：
   ```env
   PORT=5000
   JWT_SECRET=your_production_secret_key
   DB_PATH=./src/db/loanvision.db
   NODE_ENV=production
   ```

### 第四步：前端打包
在项目根目录下执行打包命令：
```bash
npm run build
```
这将在 `client/dist` 目录下生成静态文件，供后端托管。

### 第五步：使用 PM2 启动服务
确保已安装 PM2 (`npm install pm2 -g`)，然后在根目录下运行：
```bash
pm2 start ecosystem.config.js --env production
```

### 第六步：保存 PM2 状态
为了确保服务器重启后服务能自动恢复：
```bash
pm2 save
pm2 startup
```

---

## 4. 版本更新步骤

当项目代码有更新时，请按照以下步骤在服务器上进行更新：

### 第一步：拉取最新代码
```bash
git pull
```

### 第二步：更新依赖 (如有必要)
如果 `package.json` 有变动，请重新安装依赖：
```bash
# 更新后端依赖
cd server && npm install
# 更新前端依赖
cd ../client && npm install
cd ..
```

### 第三步：重新编译前端
由于后端托管的是 `client/dist` 目录，每次前端代码更新后都必须重新打包：
```bash
npm run build
```

### 第四步：重启 PM2 服务
为了使更新生效，需要重启或重载 PM2 进程：
```bash
# 推荐使用 reload 实现平滑重启
pm2 reload loan-vision
```

---

## 5. 注意事项

- **子路径部署 (Nginx)**：如果使用子路径（如 `/loanvision/`）访问，请确保：
  1. 前端 `vite.config.ts` 中的 `base` 设置为 `/loanvision/`。
  2. 后端 `server/src/index.js` 中的静态资源托管路径包含 `/loanvision` 前缀。
  3. Nginx 配置中的 `proxy_pass` 结尾带 `/`，如 `proxy_pass http://127.0.0.1:5001/;`。
- **数据库备份**：SQLite 数据库文件位于 `server/src/db/loanvision.db`。在进行重大更新前，建议备份此文件。
- **端口冲突**：如果 5000 端口被占用，请在 `server/.env` 中修改 `PORT`。
- **权限问题**：确保运行 PM2 的用户对项目目录有读写权限，特别是数据库文件所在目录。

---

## 6. 常见问题排查

### 1. 数据库权限
由于使用了 SQLite，请确保运行服务的用户对 `server/src/db/` 目录及其中的 `.db` 文件拥有读写权限。

### 2. 端口占用
如果 5000 端口已被占用，请修改 `server/.env` 中的 `PORT` 变量，并同步更新前端 `client/src/api/axios.ts` 中的 `baseURL`（如果是生产环境，通常后端会自动处理）。

### 3. 登录失效/无法获取数据
- 检查后端服务是否崩溃。
- 检查浏览器 `localStorage` 是否被禁用。
- 如果服务器重启或数据库重置，请清除浏览器缓存并重新登录。

---

## 7. 技术栈概览
- **前端**: React 18, Vite, Ant Design 5.x, Recharts.
- **后端**: Node.js, Express, SQLite (better-sqlite3).
- **认证**: JWT (JSON Web Token).
