# 徕舞小程序商用字体（子集）

本目录放在 **Next.js 后端的 `public/fonts/`** 下对外提供 HTTPS 静态文件，供小程序 `wx.loadFontFace` 加载。  
**不要**把完整思源宋体塞进小程序包。

## 文件清单

| 文件 | 用途 | 字重 | 子集字符数 | 大小 |
|---|---|---|---|---|
| `laiwu-serif-sc.woff2` | 中文标题（页面大标题、徕舞之星姓名、成功页） | SemiBold 600 | 1342 | 273208 B（约 267 KB） |
| `laiwu-serif-sc.ttf` | 同上（部分安卓对 woff2 不稳时的兜底） | SemiBold 600 | 1342 | 597388 B（约 583 KB） |
| `laiwu-numeral.woff2` | 数字与少量拉丁（余次、天数、时间） | Medium 500 | 85 | 24648 B（约 24 KB） |
| `laiwu-numeral.ttf` | 同上兜底 | Medium 500 | 85 | 73852 B（约 72 KB） |
| `charset-serif.txt` | 思源子集实际收录字符（重生时对照） | — | 1342 | — |
| `charset-numeral.txt` | 数字字体子集字符 | — | 85 | — |
| `build_subset.py` | 重新生成脚本 | — | — | — |
| `OFL-NotoSerifSC.txt` | Noto Serif SC / 思源宋体许可证 | SIL OFL 1.1 | — | — |
| `OFL-CormorantGaramond.txt` | Cormorant Garamond 许可证 | SIL OFL 1.1 | — | — |
| `OFL.txt` | 与 Noto 许可证相同的副本（便于扫描） | SIL OFL 1.1 | — | — |

小程序里建议的 `family` 名（与设计规范一致）：

- 中文标题：`LW Serif` ← `laiwu-serif-sc.woff2`（失败再试 `.ttf`）
- 数字：`LW Num` ← `laiwu-numeral.woff2`

## 来源与版本

| 字体 | 上游 | 版本 | 授权 |
|---|---|---|---|
| **Noto Serif SC SemiBold**（与 Adobe 思源宋体 Source Han Serif SC 同源） | [notofonts/noto-cjk Serif2.003](https://github.com/notofonts/noto-cjk/releases/tag/Serif2.003) ；可变 TTF：`Serif/Variable/TTF/Subset/NotoSerifSC-VF.ttf`，实例化为 `wght=600` | Version 2.003 | SIL OFL 1.1 |
| **Cormorant Garamond Medium** | [google/fonts ofl/cormorantgaramond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) 可变字体 `CormorantGaramond[wght].ttf`，实例化为 `wght=500` | Version 4.001 | SIL OFL 1.1 |

子集字符组成（思源）：

1. 扫描 `miniprogram/**/*.{wxml,js,json}` 出现的全部汉字（当前约 829 字）
2. 加上 GB2312 一级汉字编码顺序的前 500 字
3. 加上数字、英文字母、中英文标点
4. 去重 → 当前 **1342** 个字符

Cormorant：拉丁字母 + 数字 + `.,:;!?/\-_+%·–—‐'"()[]` 等 → **85** 个字符。

## 重新生成

依赖：

```bash
python3 -m venv .venv && .venv/bin/pip install fonttools brotli
```

准备源字体（任选其一方式）：

```bash
# 思源 / Noto Serif SC SemiBold（TTF）
# 下载 NotoSerifSC-VF.ttf 后：
#   python -c "from fontTools.ttLib import TTFont; from fontTools.varLib.instancer import instantiateVariableFont; \
#   f=TTFont('NotoSerifSC-VF.ttf'); instantiateVariableFont(f,{'wght':600},inplace=True); f.save('NotoSerifSC-SemiBold.ttf')"
# Cormorant：同理实例化 wght=500 → CormorantGaramond-500.ttf

export LAIWU_SERIF_SRC=/path/to/NotoSerifSC-SemiBold.ttf
export LAIWU_NUM_SRC=/path/to/CormorantGaramond-500.ttf
```

在本目录执行：

```bash
python3 build_subset.py
```

脚本会：

- 重新扫描 `../../miniprogram` 下的 `.wxml/.js/.json` 汉字
- 合并 GB2312 一级前 500 + 数字字母标点
- 写出 `laiwu-serif-sc.{woff2,ttf}`、`laiwu-numeral.{woff2,ttf}` 和 `charset-*.txt`

**以后小程序加了新的标题文案**：先改文案，再跑一遍 `build_subset.py`，把四个字体文件重新部署到后端即可。动态会员姓名不在子集里时，会回落到系统 `Songti SC` / `STSong`（设计规范允许）。

---

## 部署说明（需要 Cin 做的步骤）

### 后端现状

小程序网络层见 `miniprogram/utils/api.js`：

- 云托管环境：`crm-d8gk3n5aj45d5cf11`，服务名 `crm`
- **真机优先** `wx.cloud.callContainer`（私有链路，**不能**用来给 `wx.loadFontFace` 拉字体）
- 公网 HTTPS 回退域名：

  `https://crm-330905-9-1509862887.sh.run.tcloudbase.com`

  （2026-11-05 用 curl HEAD/GET 探测：根路径返回 **200**，Next.js；`/fonts/laiwu-serif-sc.woff2` 目前 **404**，因为字体还没部署。）

字体必须走**普通 HTTPS 静态 URL**，不能走 callContainer。

### 推荐放置位置

把本目录（`server-public/fonts/`）**整个复制**到后端 Next.js 仓库的：

```text
<fitness-crm 后端根目录>/public/fonts/
```

例如部署后应能打开：

```text
https://crm-330905-9-1509862887.sh.run.tcloudbase.com/fonts/laiwu-serif-sc.woff2
https://crm-330905-9-1509862887.sh.run.tcloudbase.com/fonts/laiwu-numeral.woff2
```

然后按你现有的云托管流程**重新构建并发布**后端（改 `public/` 后需要重新部署才会对外可见）。

### 微信小程序后台配置

1. 登录[微信公众平台](https://mp.weixin.qq.com/) → 开发管理 → 开发设置 → **服务器域名**
2. 在 **downloadFile 合法域名** 中加入（不要带路径、不要结尾斜杠）：

   `https://crm-330905-9-1509862887.sh.run.tcloudbase.com`

3. `wx.loadFontFace` 走的是 downloadFile 域名校验；若以后换自定义域名，两边一起改。
4. 建议响应头允许跨域（云托管/Next 静态资源一般已可；若加载失败再查 CORS / `content-type`）。

### 小程序加载示例（本任务未改小程序代码，仅备忘）

```js
wx.loadFontFace({
  global: true,
  family: 'LW Serif',
  source: 'url("https://crm-330905-9-1509862887.sh.run.tcloudbase.com/fonts/laiwu-serif-sc.woff2")',
  scopes: ['webview', 'native'],
});
wx.loadFontFace({
  global: true,
  family: 'LW Num',
  source: 'url("https://crm-330905-9-1509862887.sh.run.tcloudbase.com/fonts/laiwu-numeral.woff2")',
  scopes: ['webview', 'native'],
});
```

加载失败不要打断用户，静默回落系统字体即可。

### Cin 需要做的具体清单

1. 将 `laiwu-project/server-public/fonts/` 下的  
   `laiwu-serif-sc.woff2/.ttf`、`laiwu-numeral.woff2/.ttf`、两份 OFL、本 README  
   复制到后端仓库 `public/fonts/`。
2. 重新部署云托管后端（环境 `crm-d8gk3n5aj45d5cf11` / 服务 `crm`）。
3. 浏览器或 curl 确认上述两个 `.woff2` URL 返回 200。
4. 微信公众平台把该域名加进 **downloadFile 合法域名**。
5. （后续改版时）在小程序 `app.js` 里按设计规范调用 `wx.loadFontFace`——本次准备字体文件时**没有**改 miniprogram。

