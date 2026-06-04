// 真实案例定义 — 数据来自数据库，此处定义展示参数

export interface CaseStudy {
  memberId: number;
  name: string;
  role: string;
  photoPath: string;
}

// 案例列表，从数据库实时读取训练数据
export const FEATURED_CASES: CaseStudy[] = [
  {
    memberId: 1,
    name: "王莉",
    role: "在职妈妈",
    photoPath: "/cases/case-1.webp",
  },
  {
    memberId: 2,
    name: "微微",
    role: "办公室白领",
    photoPath: "/cases/case-2.webp",
  },
];
