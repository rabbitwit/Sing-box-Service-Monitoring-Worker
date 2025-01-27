# 服务状态监控面板

一个基于 Cloudflare Workers 的轻量级服务状态监控面板，用于监控 Sing-box 和 Argo 服务的运行状态。

## 功能特点

- 🔍 实时监控多个服务器的运行状态
- 🔒 管理员登录系统
- 📊 直观的状态显示界面
- 📱 响应式设计，支持移动端
- ⚙️ 支持服务启动/停止控制
- 📝 查看服务器进程列表
- 🔄 自动刷新状态
- 🌐 支持跨域请求

## 使用方法

### 1. 部署到 Cloudflare Workers

1. 登录到 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 创建新的 Worker
4. 将 `_worker.js` 代码复制到 Worker 编辑器中

### 2. 配置环境变量

在 Worker 的设置中添加以下环境变量：

- `ADMIN_PASSWORD`: 管理员登录密码
- `MONITOR_URLS`: 监控配置（JSON 格式），例如：
```json
[
    {
        "name": "服务器1",
        "url": "https://your-server-1.com/status"
    },
    {
        "name": "服务器2",
        "url": "https://your-server-2.com/status"
    }
]

### 3. 配置监控端点

确保被监控的服务器提供以下 API 端点：

- `/status`: 返回服务状态信息
- `/start`: 启动服务
- `/stop`: 停止服务
- `/list`: 获取进程列表

API 返回格式示例：
```json
{
    "services": [
        {
            "name": "sbx",
            "status": "running"
        },
        {
            "name": "argo",
            "status": "running"
        }
    ]
}

## 功能说明

### 管理员功能
- 登录系统（有效期20分钟）
- 控制服务启动/停止
- 查看服务器进程列表

### 监控功能
- 显示 Sing-box 服务状态
- 显示 Argo 服务状态
- 错误状态提示
- 自动检测服务异常

### 界面特性
- 响应式设计
- 状态颜色标识（绿色正常，红色异常）
- 简洁的操作界面
- 移动端优化

## 安全说明

- 所有管理操作都需要登录验证
- 使用环境变量存储敏感信息
- 支持 robots.txt 防爬虫
- 所有请求使用 HTTPS

## 依赖项目

- [eooce/Sing-box](https://github.com/eooce/Sing-box)

## 许可证

MIT License

## 作者

Hares

## 版本

1.0.0
