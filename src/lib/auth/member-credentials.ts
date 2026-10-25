// 会员登录凭据生成：8 位邀请码 + 6 位登录 PIN
// 邀请码用于小程序登录页第一格（专属邀请码），PIN 用于第二格（无手机号会员的第二因子）

import crypto from "crypto";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePortalCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return out;
}

export function generateLoginPin(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function isValidPortalCode(code: string): boolean {
  return /^[A-Z0-9]{4,20}$/.test(code);
}

export function isValidLoginPin(pin: string): boolean {
  return /^[0-9]{4,8}$/.test(pin);
}
