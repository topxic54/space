/**
 * LLM 调用工具类（前端版本）
 * 通过 API 调用后端的 LLM 服务
 */

// Tools 类型定义
export type Tool = { googleSearch: Record<string, never> };

/**
 * 调用普通文本 LLM
 * @param prompt 用户输入的文本
 * @param systemPrompt 可选的系统提示词
 * @param tools 可选的工具列表，例如 [{ googleSearch: {} }] 用于联网搜索
 * @returns LLM 响应的文本内容
 *
 * @example
 * // 普通调用
 * const result = await callLLM('你好');
 *
 * // 使用 Google Search 进行联网搜索
 * const result = await callLLM('今天的天气怎么样？', undefined, [{ googleSearch: {} }]);
 */
export async function callLLM(prompt: string, systemPrompt?: string, tools?: Tool[]): Promise<string> {
  let response: Response;
  try {
    response = await fetch('./api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt, tools }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[callLLM] 网络请求失败:', err);
    throw new Error(`LLM 请求失败: 网络错误 - ${message}`);
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch {
      try {
        const text = await response.text();
        if (text) errorMsg = text.slice(0, 200);
      } catch { /* ignore */ }
    }
    console.error('[callLLM] API 返回错误:', { status: response.status, error: errorMsg });
    throw new Error(`LLM 调用失败: ${errorMsg}`);
  }

  try {
    const data = await response.json();
    return data.result;
  } catch (err) {
    console.error('[callLLM] 响应解析失败:', err);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`LLM 响应解析失败: ${message}`);
  }
}

/**
 * 调用多模态 VLM（视觉语言模型）
 * @param prompt 用户输入的文本
 * @param imageUrl 图片 URL 或 base64 编码的图片
 * @param systemPrompt 可选的系统提示词
 * @returns VLM 响应的文本内容
 */
export async function callVLM(
  prompt: string,
  imageUrl: string,
  systemPrompt?: string
): Promise<string> {
  let response: Response;
  try {
    response = await fetch('./api/vlm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageUrl, systemPrompt }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[callVLM] 网络请求失败:', err);
    throw new Error(`VLM 请求失败: 网络错误 - ${message}`);
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch {
      try {
        const text = await response.text();
        if (text) errorMsg = text.slice(0, 200);
      } catch { /* ignore */ }
    }
    console.error('[callVLM] API 返回错误:', { status: response.status, error: errorMsg });
    throw new Error(`VLM 调用失败: ${errorMsg}`);
  }

  try {
    const data = await response.json();
    return data.result;
  } catch (err) {
    console.error('[callVLM] 响应解析失败:', err);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`VLM 响应解析失败: ${message}`);
  }
}

/**
 * 调用生图模型
 * @param prompt 图片生成的描述文本
 * @returns 生成的图片 URL（base64 格式）数组
 */
export async function callGenImage(prompt: string): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch('./api/gen-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[callGenImage] 网络请求失败:', err);
    throw new Error(`生图请求失败: 网络错误 - ${message}`);
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch {
      try {
        const text = await response.text();
        if (text) errorMsg = text.slice(0, 200);
      } catch { /* ignore */ }
    }
    console.error('[callGenImage] API 返回错误:', { status: response.status, error: errorMsg });
    throw new Error(`生图失败: ${errorMsg}`);
  }

  try {
    const data = await response.json();
    return data.images;
  } catch (err) {
    console.error('[callGenImage] 响应解析失败:', err);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`生图响应解析失败: ${message}`);
  }
}
