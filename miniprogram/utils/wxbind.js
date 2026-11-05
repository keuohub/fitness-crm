/**
 * 微信 openid 静默绑定
 *
 * 为什么需要它：
 * 上课提醒 / 取消通知都靠微信订阅消息推，而推送必须知道 openid。
 * 现在登录走的是「邀请码 + 手机号后四位」，全程不碰 wx.login，
 * 所以 275 位会员的 wechat_open_id 全是空的 —— 推送一条都发不出去。
 *
 * 做法：在会员已经登录成功之后，静默调一次 wx.login 拿 code，
 * 交给后端绑到"当前这个会员"身上。不新建账号、不改登录方式、会员无感。
 */

var api = require("./api.js");

var FLAG = "openidBound";
var running = false;

function hasSession() {
  return Boolean(wx.getStorageSync("memberToken")) || Boolean(wx.getStorageSync("memberId"));
}

function bind() {
  if (running) return;
  if (!hasSession()) return;
  if (wx.getStorageSync(FLAG)) return;
  if (!wx.login) return;

  running = true;

  wx.login({
    success: function (res) {
      if (!res || !res.code) {
        running = false;
        return;
      }
      api.request({
        url: "/api/portal/bind-openid",
        method: "POST",
        data: { code: res.code },
        success: function (r) {
          if (r && r.statusCode === 200 && r.data && r.data.ok) {
            wx.setStorageSync(FLAG, true);
          }
        },
        complete: function () {
          running = false;
        }
      });
    },
    fail: function () {
      running = false;
    }
  });
}

function reset() {
  try {
    wx.removeStorageSync(FLAG);
  } catch (e) {}
}

module.exports = { bind: bind, reset: reset };
