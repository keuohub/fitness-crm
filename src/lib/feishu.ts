/**
 * 飞书 API 客户端 — 使用 tenant_access_token 认证，带缓存
 */

const BASE_URL = "https://open.feishu.cn/open-apis";

interface TokenCache {
  token: string;
  expiresAt: number; // 过期时间戳(ms)
}

let tokenCache: TokenCache | null = null;

async function fetchTenantToken(): Promise<string> {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET 环境变量");
  }

  const res = await fetch(`${BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  if (!res.ok) {
    throw new Error(`获取飞书 token 失败: ${res.status}`);
  }

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`飞书 token 错误: ${data.msg} (code=${data.code})`);
  }

  // token 有效期 2 小时，提前 5 分钟过期
  const expiresAt = Date.now() + (data.tenant_access_token_expire - 300) * 1000;
  tokenCache = { token: data.tenant_access_token, expiresAt };

  return tokenCache.token;
}

export async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  return fetchTenantToken();
}

// ────────── 飞书 API 调用 ──────────

export interface FeishuRecord {
  recordId: string;
  fields: Record<string, unknown>;
}

export interface ListRecordsResult {
  items: FeishuRecord[];
  hasMore: boolean;
  pageToken?: string;
}

/**
 * 获取表格记录列表（自动分页）
 */
export async function listTableRecords(
  appToken: string,
  tableId: string,
  pageSize = 500
): Promise<FeishuRecord[]> {
  const token = await getAccessToken();
  const allRecords: FeishuRecord[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: String(pageSize) });
    if (pageToken) params.set("page_token", pageToken);

    const url = `${BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records?${params}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`飞书 API 错误 ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`飞书 API 错误: ${data.msg} (code=${data.code})`);
    }

    const items: FeishuRecord[] = (data.data?.items || []).map(
      (item: { record_id: string; fields: Record<string, unknown> }) => ({
        recordId: item.record_id,
        fields: item.fields,
      })
    );

    allRecords.push(...items);
    pageToken = data.data?.page_token;
  } while (pageToken);

  return allRecords;
}
