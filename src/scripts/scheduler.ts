/**
 * 定时任务调度器 — 每天 8:00 自动生成每日反馈
 * 用法：npx tsx src/scripts/scheduler.ts
 */

import cron from "node-cron";
import { manualRun } from "@/scripts/daily-feedback-cron";

console.log("定时任务已启动 · 每日 8:00 自动生成反馈");

// 每天 8:00 执行
cron.schedule("0 8 * * *", async () => {
  console.log(`\n[${new Date().toLocaleString("zh-CN")}] 开始执行每日反馈生成...`);
  try {
    await manualRun();
    console.log("每日反馈生成完成");
  } catch (err) {
    console.error("定时任务执行失败:", err);
  }
});

// 优雅退出
process.on("SIGINT", () => {
  console.log("\n收到 SIGINT，退出...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n收到 SIGTERM，退出...");
  process.exit(0);
});
