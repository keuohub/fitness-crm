/**
 * 微信订阅消息 · 统一入口
 *
 * 为什么单独一个文件：
 * 1) 订阅消息模板 ID 由小程序后台「功能 → 订阅消息」创建后才有，
 *    代码里必须先留空位，没有配置时静默跳过，绝不能因为缺 ID 就报错或阻塞预约。
 * 2) wx.requestSubscribeMessage 必须在用户点击手势里调用，不能在 onLoad / 回调里调，
 *    所以这里只提供「点一下就请求」的函数，由页面按钮 bindtap 触发。
 *
 * 上线前要做的唯一一件事：
 * 到小程序后台 → 订阅消息 → 选用「上课提醒」类目模板 → 把模板 ID 填进下面。
 */

// 模板 ID 配置位：填入形如 "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 的 32 位字符串
var TEMPLATE_IDS = {
  // 上课提醒（开课前提醒）
  classReminder: "",
  // 排课变更 / 课程取消通知
  classChanged: "",
  // 教练课后留了手记
  coachNote: ""
};

function configuredIds() {
  var ids = [];
  for (var k in TEMPLATE_IDS) {
    if (TEMPLATE_IDS[k]) ids.push(TEMPLATE_IDS[k]);
  }
  return ids;
}

function isConfigured() {
  return configuredIds().length > 0;
}

/**
 * 请求订阅授权。
 * @param {Array<string>} keys TEMPLATE_IDS 的键名，如 ["classReminder"]
 * @param {Function} done 回调 ({ ok, accepted, rejected, skipped })
 */
function request(keys, done) {
  var cb = typeof done === "function" ? done : function () {};
  var wanted = (keys && keys.length ? keys : Object.keys(TEMPLATE_IDS));
  var ids = [];
  for (var i = 0; i < wanted.length; i++) {
    var id = TEMPLATE_IDS[wanted[i]];
    if (id) ids.push(id);
  }

  // 模板还没配：不算失败，也不打扰会员
  if (!ids.length) {
    cb({ ok: false, skipped: true, reason: "not_configured" });
    return;
  }

  if (!wx.requestSubscribeMessage) {
    cb({ ok: false, skipped: true, reason: "unsupported" });
    return;
  }

  wx.requestSubscribeMessage({
    tmplIds: ids,
    success: function (res) {
      var accepted = [];
      var rejected = [];
      for (var j = 0; j < ids.length; j++) {
        if (res[ids[j]] === "accept") accepted.push(ids[j]);
        else if (res[ids[j]] === "reject") rejected.push(ids[j]);
      }
      cb({ ok: true, accepted: accepted, rejected: rejected, raw: res });
    },
    fail: function (err) {
      cb({ ok: false, skipped: false, reason: (err && err.errMsg) || "fail" });
    }
  });
}

module.exports = {
  request: request,
  isConfigured: isConfigured,
  TEMPLATE_IDS: TEMPLATE_IDS
};
