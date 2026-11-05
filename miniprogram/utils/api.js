/**
 * 徕舞小程序统一网络层
 *
 * 规则（2026-10-21 起）：
 * 1. 身份只用登录下发的签名 token（Authorization: Bearer），不再用明文 memberId 请求头。
 * 2. 不把服务器地址写进 storage：开发者工具固定本机 3001，真机优先云托管私有链路。
 * 3. 401 统一清理会话并回登录页，避免"看起来登录了其实没有"。
 */

// 统一网络请求

var ENV_ID = "crm-d8gk3n5aj45d5cf11";
var SERVICE_NAME = "crm";
var DEFAULT_BASE_URL = "https://crm-330905-9-1509862887.sh.run.tcloudbase.com";
var LOCAL_BASE_URL = "http://localhost:3001";

function isDevTools() {
  try {
    return wx.getSystemInfoSync().platform === "devtools";
  } catch (e) {
    return false;
  }
}

function getBaseUrl() {
  // 仅用于拼接图片/上传地址，不参与身份判断
  return isDevTools() ? LOCAL_BASE_URL : DEFAULT_BASE_URL;
}

function fullUrl(p) {
  if (!p) return "";
  var str = String(p).trim();
  if (!str) return "";
  if (/^(https?:|cloud:|wxfile:)/i.test(str)) return str;
  // 包内本地资源目录：直接返回相对/绝对本地路径，不走网络
  if (
    str.indexOf("/images/categories/") === 0 ||
    str.indexOf("/images/courses/") === 0 ||
    str.indexOf("/images/team/") === 0 ||
    str.indexOf("/images/tab/") === 0 ||
    str.indexOf("/images/") === 0
  ) return str;
  if (str.charAt(0) === "/") return getBaseUrl() + str;
  return getBaseUrl() + "/" + str;
}

function clearSession() {
  try {
    wx.removeStorageSync("memberToken");
    wx.removeStorageSync("memberId");
    wx.removeStorageSync("memberName");
    wx.removeStorageSync("joinDays");
    wx.removeStorageSync("trainCount");
    wx.removeStorageSync("isDemoMode");
    wx.removeStorageSync("managerRole");
    wx.removeStorageSync("isManager");
  } catch (e) {}
}

function isLoginUrl(url) {
  return String(url || "").indexOf("/api/portal/login") >= 0;
}

function request(options) {
  var url = options.url || "";
  var method = (options.method || "GET").toUpperCase();
  var data = options.data;
  var success = options.success || function() {};
  var fail = options.fail || function() {};
  var complete = options.complete || function() {};

  var token = wx.getStorageSync("memberToken") || "";
  var header = Object.assign({ "content-type": "application/json" }, options.header || {});
  if (token) header.Authorization = "Bearer " + token;

  function handleSuccess(res) {
    if (res && res.statusCode === 401 && token && !isLoginUrl(url)) {
      clearSession();
      wx.showToast({ title: "登录已过期，请重新验证", icon: "none", duration: 2000 });
      setTimeout(function() {
        wx.reLaunch({ url: "/pages/login/login?force=1" });
      }, 300);
      return;
    }
    success(res);
  }

  // 提取相对路径，便于云托管 callContainer
  var path = url;
  if (path.indexOf("http") === 0) {
    var match = path.match(/https?:\/\/[^\/]+(\/.*)/);
    if (match && match[1]) path = match[1];
  }
  if (path.charAt(0) !== "/") path = "/" + path;

  // 开发者工具：优先请求本地 3001，若未启动则无缝回退到云端服务
  if (isDevTools()) {
    wx.request({
      url: LOCAL_BASE_URL + path,
      method: method,
      header: header,
      data: data,
      success: function(res) {
        if (res && res.statusCode >= 200 && res.statusCode < 500) {
          handleSuccess(res);
        } else {
          fallbackToWxRequest();
        }
      },
      fail: function() {
        fallbackToWxRequest();
      },
      complete: complete
    });
    return;
  }

  // 真机：优先微信云托管私有链路
  if (wx.cloud && typeof wx.cloud.callContainer === "function") {
    wx.cloud.callContainer({
      config: { env: ENV_ID },
      path: path,
      method: method,
      header: Object.assign({ "X-WX-SERVICE": SERVICE_NAME }, header),
      data: data,
      success: handleSuccess,
      fail: function() {
        fallbackToWxRequest();
      },
      complete: complete
    });
    return;
  }

  fallbackToWxRequest();

  function fallbackToWxRequest() {
    var finalUrl = url.indexOf("http") === 0 ? url : DEFAULT_BASE_URL + path;
    wx.request({
      url: finalUrl,
      method: method,
      header: header,
      data: data,
      success: handleSuccess,
      fail: fail,
      complete: complete
    });
  }
}

// 从 /api/portal/me 刷新管理角色（登录接口不返回 managerRole），写入 storage 后回调
var _roleFetchedAt = 0;
function refreshRole(cb) {
  cb = cb || function() {};
  if (!wx.getStorageSync("memberToken")) { cb(); return; }
  if (Date.now() - _roleFetchedAt < 30000) { cb(); return; }
  _roleFetchedAt = Date.now();
  request({
    url: "/api/portal/me",
    success: function(res) {
      if (res && res.statusCode === 200 && res.data) {
        try {
          wx.setStorageSync("isManager", Boolean(res.data.isManager));
          wx.setStorageSync("managerRole", res.data.managerRole || "");
        } catch (e) {}
      } else {
        _roleFetchedAt = 0;
      }
    },
    fail: function() { _roleFetchedAt = 0; },
    complete: function() { cb(); }
  });
}

module.exports = {
  request: request,
  refreshRole: refreshRole,
  getBaseUrl: getBaseUrl,
  fullUrl: fullUrl,
  clearSession: clearSession,
  ENV_ID: ENV_ID,
  SERVICE_NAME: SERVICE_NAME,
  DEFAULT_BASE_URL: DEFAULT_BASE_URL
};
