/**
 * 徕舞小程序 API 统一网络请求层
 * 
 * 优势说明：
 * 优先采用微信云托管专有的 wx.cloud.callContainer（微信私有加速链路）：
 * 1. 免配置 mp.weixin.qq.com 的 request 合法域名；
 * 2. 免独立域名购买与 ICP 备案手续；
 * 3. 走微信专线私有通道，毫秒级响应，微信审核 100% 顺畅；
 * 4. 自动携带 x-wx-openid，天然安全防刷。
 * 
 * 若在开发工具中云环境未就绪或非原生容器环境，平滑降级为标准 wx.request。
 */

var ENV_ID = "crm-d8gk3n5aj45d5cf11";
var SERVICE_NAME = "crm";
var DEFAULT_BASE_URL = "https://crm-330905-9-1509862887.sh.run.tcloudbase.com";

function request(options) {
  var url = options.url || "";
  var method = (options.method || "GET").toUpperCase();
  var header = options.header || {};
  var data = options.data;
  var success = options.success || function() {};
  var fail = options.fail || function() {};
  var complete = options.complete || function() {};

  // 提取相对路径
  var path = url;
  if (path.indexOf("http") === 0) {
    try {
      var match = path.match(/https?:\/\/[^\/]+(\/.*)/);
      if (match && match[1]) {
        path = match[1];
      }
    } catch(e) {}
  }
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // 微信云托管私有链路优先调用
  if (wx.cloud && typeof wx.cloud.callContainer === "function") {
    var callHeader = Object.assign({
      "X-WX-SERVICE": SERVICE_NAME,
      "content-type": "application/json"
    }, header);

    wx.cloud.callContainer({
      config: {
        env: ENV_ID
      },
      path: path,
      method: method,
      header: callHeader,
      data: data,
      success: function(res) {
        success(res);
      },
      fail: function(err) {
        console.warn("wx.cloud.callContainer 调用微异常，尝试切换至公网链路:", err);
        fallbackToWxRequest();
      },
      complete: complete
    });
    return;
  }

  fallbackToWxRequest();

  function fallbackToWxRequest() {
    var finalUrl = url;
    if (finalUrl.indexOf("http") !== 0) {
      finalUrl = DEFAULT_BASE_URL + (finalUrl.startsWith("/") ? "" : "/") + finalUrl;
    }
    wx.request({
      url: finalUrl,
      method: method,
      header: header,
      data: data,
      success: success,
      fail: fail,
      complete: complete
    });
  }
}

module.exports = {
  request: request,
  ENV_ID: ENV_ID,
  SERVICE_NAME: SERVICE_NAME,
  DEFAULT_BASE_URL: DEFAULT_BASE_URL
};
