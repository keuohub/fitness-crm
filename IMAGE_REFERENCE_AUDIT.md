# IMAGE_REFERENCE_AUDIT.md — Sprint 39A

## 品牌组件图片引用扫描

| 组件 | 图片类型 | 路径 | 在 page.tsx 中渲染 | 状态 |
|------|---------|------|:---:|------|
| StudioShowcaseSection | `next/image` × 3 | `/brand/studio/studio-1.jpg`, `/brand/studio/reformer-1.jpg`, `/brand/training/detail-1.jpg` | 否（死亡代码） | 不影响首页 |

## 结论

**首页零图片引用。**

唯一有图片引用的 `StudioShowcaseSection` 是死亡代码，不在首页渲染。

所有活跃组件（17 个板块）均无 Image / img 标签，无 Unsplash 引用，无 .jpg/.png/.webp 引用。

---

> 审计完成。首页纯文字驱动，零图片。
