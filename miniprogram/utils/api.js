/**
 * 徕舞小程序统一网络层
 *
 * 规则（2026-10-21 起）：
 * 1. 身份只用登录下发的签名 token（Authorization: Bearer），不再用明文 memberId 请求头。
 * 2. 不把服务器地址写进 storage：开发者工具固定本机 3001，真机优先云托管私有链路。
 * 3. 401 统一清理会话并回登录页，避免"看起来登录了其实没有"。
 */

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

function clearSession() {
  try {
    wx.removeStorageSync("memberToken");
    wx.removeStorageSync("memberId");
    wx.removeStorageSync("memberName");
    wx.removeStorageSync("joinDays");
    wx.removeStorageSync("trainCount");
    wx.removeStorageSync("isDemoMode");
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

  // 开发者工具：固定本机后端，避免登录后被切到旧云部署
  if (isDevTools()) {
    wx.request({
      url: LOCAL_BASE_URL + path,
      method: method,
      header: header,
      data: data,
      success: handleSuccess,
      fail: fail,
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

module.exports = {
  request: request,
  getBaseUrl: getBaseUrl,
  clearSession: clearSession,
  ENV_ID: ENV_ID,
  SERVICE_NAME: SERVICE_NAME,
  DEFAULT_BASE_URL: DEFAULT_BASE_URL
};
