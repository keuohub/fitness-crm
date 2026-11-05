import { NextResponse } from "next/server";

/**
 * 会员端统一的 JSON 响应
 *
 * 为什么不能直接 NextResponse.json：
 * 没有 Cache-Control 的 GET 响应，会被客户端按"启发式缓存"自行决定缓存多久。
 * 微信小程序的网络栈、iOS/Android 系统 HTTP 缓存都可能参与，
 * 结果就是后台改了场馆、导师、课表，会员那边还是旧的 —— 而且没有报错，最难查。
 *
 * 这些数据全部是"以服务器为准"的经营数据，一律 private + no-store。
 */
export function noStore<T>(data: T, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
