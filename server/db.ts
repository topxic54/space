/**
 * SQLite 数据库连接（开箱即用）
 * 使用 Node.js 22 内置 node:sqlite 模块，无需安装额外依赖
 * 数据存储在 ./data/database.db，开发和部署环境均可访问
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'database.db'));

export default db;
