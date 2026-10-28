# IMAGE_USAGE_AUDIT.md — Sprint 37D

## 检查范围

- StudioShowcaseSection
- CasesSection
- StoriesTeaserSection
- StudioGallerySection

## 结果

| 组件 | 文件路径 | 是否引用图片 | 图片路径 | 图片是否存在 | 是否在 page.tsx 渲染 | 风险 |
|------|---------|:---:|------|:---:|:---:|------|
| StudioShowcaseSection | src/components/brand/StudioShowcaseSection.tsx | 是 | `/brand/studio/studio-1.jpg`, `/brand/studio/reformer-1.jpg` | **否（目录为空）** | **否（死亡代码）** | 无 — 组件未被引用 |
| StudioGallerySection | src/components/brand/StudioGallerySection.tsx | 未检查（同属死亡代码） | — | — | **否（死亡代码）** | 无 |
| CasesSection | src/components/brand/CasesSection.tsx | 否 | — | — | 是 | 无 |
| StoriesTeaserSection | src/components/brand/StoriesTeaserSection.tsx | 否（纯数据驱动） | — | — | 是 | 无 |

## 结论

- **3 个被检查的活跃组件中，均无图片依赖问题**
- **StudioShowcaseSection 引用了不存在的图片，但它本身是死亡代码**（不在 page.tsx 中渲染）
- **建议**：如后续启用 StudioShowcaseSection，需先补充 `/public/brand/studio/` 下的图片文件

## 现有图片资产

```
public/brand/
├── cases/    (空目录)
├── hero/     (空目录)
├── members/
│   └── member-1.jpg
└── story/
    ├── story-1.jpg
    ├── story-2.jpg
    └── story-3.jpg
```

---

> 图片审计完成。活跃组件无风险，死亡代码留待后续清理。
