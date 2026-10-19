# FEISHU_WRITE_PROOF.md — 飞书写入能力验证

> 验证日期：2026-06-06
> 验证人：自动化测试

---

## 1. 配置确认

| 配置项 | 值 | 状态 |
|--------|-----|:---:|
| APP_ID | `cli_aa9f9...` | 可用 |
| APP_SECRET | `lmJG16x...` | 可用 |
| BASE_TOKEN | `RnlqbnTcBaGIW0skLLWclgHbnzb` | 可用 |
| TABLE_ID（会员表） | `tblg1rCqMOOjksj5` | 可用 |
| 飞书应用权限 | `bitable:app` | 已有 |

---

## 2. API 调用

### Step 1: 获取 tenant_access_token

```
POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal
Body: { app_id, app_secret }

响应: { code: 0, tenant_access_token: "t-g10466fI4QOTZR3HAH..." }
```

### Step 2: 创建测试记录

```
POST https://open.feishu.cn/open-apis/bitable/v1/apps/{BASE_TOKEN}/tables/{TABLE_ID}/records
Authorization: Bearer {token}
Body: {
  "fields": {
    "姓名": "测试用户_CRM写入验证",
    "问卷编号": "TEST-1765366650000"
  }
}
```

---

## 3. 返回结果

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "record": {
      "record_id": "recvlKpv87ynTd",
      "fields": {
        "姓名": "测试用户_CRM写入验证"
      }
    }
  }
}
```

---

## 4. 写入验证

| 验证项 | 结果 |
|--------|:---:|
| HTTP 状态码 | 200 |
| 飞书 API code | 0（成功） |
| 记录 ID | `recvlKpv87ynTd` |
| 姓名字段 | 「测试用户_CRM写入验证」 |

---

## 5. 飞书中的记录位置

表格链接：
https://bytedance.feishu.cn/base/RnlqbnTcBaGIW0skLLWclgHbnzb?table=tblg1rCqMOOjksj5

在飞书多维表格中搜索「测试用户_CRM写入验证」即可看到新创建的记录。

---

## 6. 飞书表格真实字段名（部分关键字段）

从飞书 API 读取第一条记录获得的真实字段名（注意：这些是飞书列名，不是 CRM 数据库列名）：

| 飞书字段名 | 示例值 |
|-----------|--------|
| `姓名` | 王莉 |
| `年龄` | 30 |
| `身高（cm）` | 157 |
| `体重（kg）` | 98 |
| `职业` | 教师 |
| `平均睡眠时间` | 7 |
| `平时工作状态` | ["久坐","久站","压力大"] |
| `目前运动频率` | 偶尔 |
| `目前最想改善的问题` | ["减脂塑形","妈妈臀"...] |
| `一天大概喝多少水` | 300到500ml |
| `平时几点睡觉` | 11到12点之间 |
| `早餐通常吃什么` | 面包鸡蛋蒸饺等 |
| `午餐通常吃什么` | 米饭 |
| `晚餐通常吃什么` | 米饭 |
| `是否容易疲惫` | 是 |
| `是否经常肩颈酸痛` | 是 |
| `是否腰痛` | 否 |
| `是否长期久坐` | 是 |
| `是否容易焦虑` | 是 |
| `是否容易便秘` | 否 |
| `是否容易水肿` | 否 |
| `是否经常点外卖` | 否 |
| `是否爱喝奶茶/甜饮` | 否 |
| `是否经常吃夜宵` | 否 |
| `是否容易嘴馋` | 是 |
| `是否长期节食过` | 否 |
| `经期是否规律` | 是 |
| `经期前是否容易暴食` | 否 |
| `经期是否容易水肿` | 否 |
| `最容易暴食的时间` | 否 |
| `你最希望自己变成什么状态？` | 气质有型 |
| `你愿意为自己的改变投入多久？` | 长期管理 |

---

## 7. createRecord() 实现难度评估

| 维度 | 评估 |
|------|------|
| 飞书 API 权限 | 已有 `bitable:app`，可读写 |
| Token 获取 | 已有 `getAccessToken()` 函数，可直接复用 |
| API 调用格式 | 标准 REST POST，URL 格式已确认 |
| 字段名映射 | 需要建立「飞书中文字段名 ↔ CRM 数据库列名」的映射表（飞书用中文长句，CRM 用英文 snake_case） |
| 实现难度 | **低**。只需在 `src/lib/feishu.ts` 中新增约 20 行代码 |
| 风险 | 飞书表格中有些字段是数字类型（如 `体重（kg）`=98 代表 49kg 因为之前被×2处理过），写入时需注意数值转换 |

---

## 结论

**成功**

CRM 具备向飞书多维表格写入数据的能力。Token 获取正常，API 调用成功，测试记录已出现在飞书表格中。实现 `createRecord()` 函数的技术难度低。

---

> FEISHU_WRITE_PROOF.md 完成。
> 结论：成功。
