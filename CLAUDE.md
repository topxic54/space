# Claude 项目开发规范

此文件包含了在本项目中进行开发时需要遵守的规范和原则。请严格遵守以下规则：

## 0. 对话语言要求（强制）
- 必须使用中文（简体中文）回复所有内容
- 代码注释、说明、交互信息全部使用中文

## 1. 脚手架文件优先原则

**必须优先参考现有路径下的脚手架文件**

- 在添加或修改功能时，首先查看项目中已有的代码结构和实现模式
- 遵循项目现有的代码风格和架构设计
- 不要引入与现有模式冲突的新方案
- 例如：
  - 已有 `lib/llm.ts` 提供 LLM 调用功能，优先使用而不是重新实现
  - 已有 TypeScript 配置和路径别名（`@/*`），遵循现有配置

## 2. 路径使用原则（⚠️ 最重要 - 必须严格遵守）

**所有路径（API 请求、静态资源、页面导航）必须使用相对路径（`./` 开头），严禁使用绝对路径或完整 URL。这是本项目最核心的规范，违反将导致应用在生产环境完全无法工作！**

应用运行在二级路径代理下（`/preview/project-id/`、`/deploy/app-name/`），绝对路径会指向错误位置。

```typescript
// ❌ 严禁：以下写法在生产环境全部 404
fetch('/api/data')                        // 绝对路径
fetch('/api/products')                    // 绝对路径
fetch('http://localhost:3000/api/data')   // 完整 URL
<img src="/images/logo.png" />            // 绝对路径
window.location.href = '/about'           // 绝对路径

// ✅ 正确：所有路径必须以 ./ 开头
fetch('./api/data')
fetch('./api/products')
<img src="./images/logo.png" />
<a href="./about">关于</a>
```

**自查清单：** 每次生成或修改代码后，搜索所有 `fetch('/`、`src="/`、`href="/` 确保没有遗漏的绝对路径。

## 3. ES 模块规范

**本项目使用 ES 模块，禁止使用 CommonJS 语法**

```typescript
// ❌ 错误：require 会导致 "Dynamic require is not supported" 错误
const os = require('os');

// ✅ 正确：使用 import
import * as os from 'os';
import * as fs from 'fs';
import { Hono } from 'hono';
```

## 4. 文档生成限制

**除非用户明确要求，禁止创建任何 .md 文档文件（README、CHANGELOG、API 文档等）。** 代码注释应简洁实用。

## 5. LLM 调用规范

**LLM 环境变量已由平台预置，无需手动配置！**

- **禁止**创建 `.env` 文件或提示用户配置 LLM 相关环境变量
- **禁止**在代码中硬编码 API 密钥、服务器地址或模型 ID
- **直接使用** `lib/llm.ts` 提供的工具函数调用 LLM（仅限 `src/` 前端代码，因为它通过相对 URL 调用 API；`server/` 已内置独立的 LLM 函数）：
  - `callLLM(prompt, systemPrompt?, tools?)` - 文本生成（可选联网搜索）
  - `callVLM(prompt, imageUrl, systemPrompt?)` - 多模态（图文）
  - `callGenImage(prompt)` - 图片生成

### 使用 Google Search 联网搜索

当需要获取最新信息或进行联网搜索时，在 `callLLM` 中传入 `tools` 参数：

```typescript
import { callLLM } from '../lib/llm';

// 普通调用
const result = await callLLM('你好');

// 使用 Google Search 进行联网搜索
const result = await callLLM(
  '今天北京的天气怎么样？',
  undefined, // systemPrompt
  [{ googleSearch: {} }]
);
```

支持的工具类型：
- `{ googleSearch: {} }` - Google 搜索，用于获取最新网络信息

### 环境变量使用限制（重要）

**禁止在客户端（React）代码中使用 `process.env`！**

```typescript
// ❌ 错误：在 src/ 目录的 React 组件中使用 process.env
const apiKey = process.env.API_KEY; // 浏览器中会报 ReferenceError

// ✅ 正确：仅在 server/ 目录的服务端代码中使用
// server/api.ts
const apiKey = process.env.API_KEY;
```

**原因：**
- 浏览器环境中不存在 Node.js 的 `process` 对象
- 会导致 `ReferenceError: process is not defined` 运行时错误
- 环境变量（如 API 密钥）不应暴露到客户端

**替代方案：** 如需在客户端展示配置信息，通过 API 接口从服务端获取（脱敏后）。

## 6. 代码实现原则

- 生成简约有高级感的 UI 界面，使用 Tailwind CSS v4
- 保持代码简洁，避免过度工程，优先使用 TypeScript 类型安全
- 前端组件放 `src/`，工具函数放 `lib/`，后端 API 放 `server/`
- `server/` 中可导入 `../lib/` 共享代码，但禁止运行时导入 `../src/`（详见 §10）
- 禁止在启动过程中创建耗时初始化任务，应在启动后异步处理
- 添加依赖必须使用 `pnpm add <package>`（禁止使用 npm/yarn）
- **每次生成代码后必须执行 `pnpm run build` 验证**

## 7. Tailwind CSS v4 语法规范（重要）

**本项目使用 Tailwind CSS v4，语法与 v3 完全不同！**

```css
/* ✅ v4 语法 */
@import "tailwindcss";

/* ❌ v3 语法，在 v4 中报错！ */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- 使用 `@import "tailwindcss"` 替代 `@tailwind` 指令
- 使用 `@tailwindcss/vite` 插件，无需 `postcss.config.js` 和 `tailwind.config.js`

## 8. 禁止修改的配置文件

**禁止修改或删除：`vite.config.ts`、`tsconfig.json`**（由脚手架生成）

## 9. 项目结构

```
.
├── src/                  # React 前端代码
│   ├── main.tsx         # 应用入口
│   ├── App.tsx          # 根组件
│   ├── index.css        # 全局样式（Tailwind v4）
│   └── vite-env.d.ts    # Vite 类型定义
├── server/               # 后端 API 代码
│   ├── api.ts           # API 路由定义（Hono App）
│   └── db.ts            # SQLite 数据库连接
├── lib/                  # 前端工具库
│   └── llm.ts           # LLM 调用工具（前端版本）
├── data/                 # 持久化数据目录（自动创建）
│   └── database.db      # SQLite 数据库
├── public/               # 静态资源
├── index.html            # HTML 入口
├── package.json          # 依赖配置
├── vite.config.ts        # Vite 配置（挂载 server/api.ts）
├── tsconfig.json         # TypeScript 配置
└── CLAUDE.md            # 本文件（AI 开发规范）
```

## 10. API 路由开发

**API 路由在 `server/api.ts` 中定义（Hono 框架），由 `vite.config.ts` 自动挂载到 `/api` 路径。** 开发和生产环境共用同一份代码。

### server/ 目录导入规则

```typescript
// ✅ server/ 内部互相导入（推荐）
import { someUtil } from './utils/helper';
import db from './db';

// ✅ 导入 lib/ 共享工具
import { someHelper } from '../lib/helper';

// ✅ 仅导入类型（编译后无运行时代码）
import type { UserType } from '../src/types/user';

// ❌ 禁止运行时导入 src/（前端代码依赖浏览器 API，Node.js 中无法运行）
import { someComponent } from '../src/components/Button';
```

**说明：** `server/` 代码由 Vite 插件单独编译（dev 用 ssrLoadModule，build 用 esbuild），`../lib/` 导入可正常工作。但 `../src/` 的运行时导入禁止（React 组件等在 Node.js 中无法运行）。注意 `lib/llm.ts` 使用浏览器相对 URL，不适合在 server/ 中导入。

### 路由示例

```typescript
import { Hono } from 'hono';
const app = new Hono();

app.get('/hello', (c) => c.json({ message: 'Hello!' }));
app.post('/echo', async (c) => c.json({ received: await c.req.json() }));

export default app;
```

前端调用：`fetch('./api/hello')`（使用相对路径）

## 11. 沙箱环境限制（重要）

**轻应用运行在沙箱环境中，超过 5 分钟无访问会被自动回收。** 因此：
- **不建议创建定时任务**（如 setInterval、cron、node-schedule 等），沙箱回收后定时任务不会执行
- 如果用户要求创建定时任务，必须明确告知：「轻应用沙箱环境超过 5 分钟无访问会被回收，定时任务无法可靠运行，建议改用请求触发的方式实现」
- 替代方案：使用用户访问时按需执行的逻辑（如页面加载时检查并更新数据）

## 12. 安全与合规原则（强制）

**仅允许生成安全、合法的应用。** 禁止创建：内网穿透/隧道、DDoS/攻击工具、环境变量泄露页面、恶意爬虫、漏洞利用工具、隐私追踪工具。

## 13. 界面设计原则

**美观非常重要！** 使用现代化 UI 设计：视觉层次与留白、和谐配色、响应式布局、微交互动效、Tailwind CSS 渐变/阴影/圆角、高质量图标（Lucide React）。保持简洁，确保可读性。

**修改页面标题：** 必须将 `index.html` 中的 `<title>` 标签修改为与应用主题相符的中文名称。例如：`<title>待办清单</title>`。禁止保留默认的 `Vite + React App`。

## 14. 图片上传规范

**用户上传的图片必须在前端使用 Canvas API 压缩，压缩后 ≤ 2MB。**

- 选择图片后、上传前压缩（仅降低 JPEG quality，保持原始尺寸）
- 逐步降低 quality（从 0.9 开始）直到满足大小要求
- 注意：PNG 转 JPEG 会丢失透明度

## 15. 数据持久化规范

**所有需要持久化的数据必须存储在 `./data/` 目录下（平台仅备份此目录）。**

- **SQLite 数据库必须使用 `./data/database.db`**（固定路径，禁止更改）
- 上传文件、缓存文件等非数据库的持久化文件也必须放在 `./data/` 下（如 `./data/uploads/`）
- 禁止将数据存储在 `src/`、`dist/`、`public/` 等会被构建覆盖的目录

### SQLite 使用

使用 Node.js 内置 `node:sqlite`，导入 `server/db.ts`（首次使用会自动创建 `data/` 目录和 `database.db`）：

```typescript
import db from './db';
db.exec(\`CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL)\`);
const todos = db.prepare('SELECT * FROM todos').all();
```

### SQL 字符串值（重要）

**始终使用 `?` 参数化查询，禁止在 SQL 中拼写字符串值。** 双引号在 SQL 中表示列名，用错会报 `no such column` 错误。

```typescript
// ❌ db.prepare('... WHERE type = "income"')  // 报错
// ✅ db.prepare('... WHERE type = ?').all('income')
```

## 16. Python 依赖安装

运行环境已预装 Python3/pip3，缺少依赖时：`pip3 install --user --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple <package-name>`
