/**
 * API 路由定义
 *
 * 这是项目的 API 入口文件，所有后端 API 都在这里定义。
 * 使用 Hono 框架，挂载到 Vite 的 middleware 中。
 *
 * 开发环境和生产环境都会加载这个文件。
 *
 * ⚠️ 前端调用 API 必须使用相对路径：
 *   ✅ fetch('./api/xxx')
 *   ❌ fetch('/api/xxx')    ← 生产环境 404！
 *
 * 导入规则：
 * - server/ 内部互相导入：import { xxx } from './utils/helper'（推荐）
 * - 导入 lib/ 共享代码：import { xxx } from '../lib/xxx'（✅ 允许）
 * - 导入 src/ 类型：import type { T } from '../src/types/xxx'（✅ 仅类型）
 * - 禁止运行时导入 src/：src/ 是前端代码，依赖浏览器 API
 */

import { Hono } from 'hono';
import * as dotenv from 'dotenv';
dotenv.config();

const app = new Hono();

// ============================================================
// LLM 配置 - 从环境变量读取
// ============================================================
const LLM_API_URL = process.env.LLM_API_URL || '';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL_ID = process.env.LLM_MODEL_ID || '';
const VLM_MODEL_ID = process.env.VLM_MODEL_ID || '';
const GEN_IMAGE_MODEL_ID = process.env.GEN_IMAGE_MODEL_ID || '';

// ============================================================
// LLM 调用函数
// ============================================================
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
}

interface LLMResponse {
  choices: {
    message: {
      content: string;
      images?: { image_url: { url: string } }[];
    };
  }[];
}

type Tool = { googleSearch: Record<string, never> };

async function callAPI(model: string, messages: ChatMessage[], tools?: Tool[]): Promise<LLMResponse> {
  if (!LLM_API_URL) {
    console.error('[callAPI] LLM_API_URL 环境变量未配置');
    throw new Error('LLM_API_URL 环境变量未配置');
  }
  if (!LLM_API_KEY) {
    console.error('[callAPI] LLM_API_KEY 环境变量未配置');
    throw new Error('LLM_API_KEY 环境变量未配置');
  }
  if (!model) {
    console.error('[callAPI] 模型 ID 未配置');
    throw new Error('模型 ID 未配置');
  }

  const body: Record<string, unknown> = { model, messages };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  let response: Response;
  try {
    response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[callAPI] 网络请求失败:', err);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`LLM API 网络请求失败: ${message}`);
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorText = await response.text();
      // 尝试解析 JSON 错误
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error?.message || errorJson.message || errorJson.error || errorText;
      } catch {
        errorDetail = errorText;
      }
    } catch {
      errorDetail = '无法读取错误响应';
    }
    console.error('[callAPI] API 返回错误:', { status: response.status, model, error: errorDetail.slice(0, 500) });
    throw new Error(`LLM API 返回错误 (HTTP ${response.status}): ${errorDetail.slice(0, 500)}`);
  }

  try {
    return await response.json();
  } catch (err) {
    console.error('[callAPI] 响应解析失败:', err);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`LLM API 响应解析失败: ${message}`);
  }
}

async function callLLM(prompt: string, systemPrompt?: string, tools?: Tool[]): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const response = await callAPI(LLM_MODEL_ID, messages, tools);
  return response.choices[0]?.message?.content || '';
}

async function callVLM(prompt: string, imageUrl: string, systemPrompt?: string): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
    ],
  });
  const response = await callAPI(VLM_MODEL_ID, messages);
  return response.choices[0]?.message?.content || '';
}

async function callGenImage(prompt: string): Promise<string[]> {
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const response = await callAPI(GEN_IMAGE_MODEL_ID, messages);
  const images = response.choices[0]?.message?.images || [];
  return images.map((img) => img.image_url.url);
}

// ============================================================
// API 路由
// ============================================================

// 健康检查
app.get('/health', (c) => {
  return c.json({ ok: true, timestamp: Date.now() });
});

// LLM 文本生成（支持可选的 tools 参数，如 Google Search）
app.post('/llm', async (c) => {
  try {
    const { prompt, systemPrompt, tools } = await c.req.json();
    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: '缺少 prompt 参数' }, 400);
    }

    const toolsArray = Array.isArray(tools) ? tools as Tool[] : undefined;
    const result = await callLLM(prompt, systemPrompt, toolsArray);
    return c.json({ result });
  } catch (error) {
    console.error('LLM 调用失败:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'LLM 调用失败',
    }, 500);
  }
});

// VLM 多模态（视觉语言模型）
app.post('/vlm', async (c) => {
  try {
    const { prompt, imageUrl, systemPrompt } = await c.req.json();
    if (!prompt || typeof prompt !== 'string' || !imageUrl || typeof imageUrl !== 'string') {
      return c.json({ error: '缺少 prompt 或 imageUrl 参数' }, 400);
    }

    const result = await callVLM(prompt, imageUrl, systemPrompt);
    return c.json({ result });
  } catch (error) {
    console.error('VLM 调用失败:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'VLM 调用失败',
    }, 500);
  }
});

// 图片生成
app.post('/gen-image', async (c) => {
  try {
    const { prompt } = await c.req.json();
    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: '缺少 prompt 参数' }, 400);
    }

    const images = await callGenImage(prompt);
    return c.json({ images });
  } catch (error) {
    console.error('生图失败:', error);
    return c.json({
      error: error instanceof Error ? error.message : '生图失败',
    }, 500);
  }
});

// ============================================================
// SQLite 示例 - 使用 node:sqlite 内置模块
// 重要：SQL 字符串值必须用单引号，双引号在 SQL 中表示列名
// ============================================================
import db from './db';

db.exec(`
  CREATE TABLE IF NOT EXISTS scaffold_demo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// SQLite 示例：使用参数化查询（详见 CLAUDE.md 第 16 章）
app.get('/demo', (c) => {
  const stats = db.prepare('SELECT type, COUNT(*) as count FROM scaffold_demo WHERE type = ? GROUP BY type').all('default');
  return c.json(stats);
});

export default app;
