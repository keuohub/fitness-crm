var api = require("../../utils/api.js");
Page({
  data: { loading: true, error: "", notes: [] },
  onLoad: function() {
    if (!wx.getStorageSync("memberToken")) { wx.reLaunch({ url: "/pages/login/login?force=1" }); return; }
    this.load();
  },
  onPullDownRefresh: function() { var that=this; this.load(function(){wx.stopPullDownRefresh();}); },
  load: function(done) {
    var that=this, finished=typeof done==="function"?done:function(){};
    api.request({ url:"/api/portal/notes", success:function(res){
      if(res.statusCode===200&&res.data&&Array.isArray(res.data.notes)){
        that.setData({loading:false,error:"",notes:res.data.notes.map(function(n){
          return {id:n.id,content:n.content,date:n.session_date||"",time:n.start_time?n.start_time+"-"+n.end_time:"",course:n.course_name||"课程",coach:n.coach_name||"教练"};
        })});
      } else if(res.statusCode===401){ that.setData({loading:false,error:"登录已过期，请重新登录"}); }
      else { that.setData({loading:false,error:"暂时没有加载到记录，请下拉重试"}); }
      finished();
    }, fail:function(){ that.setData({loading:false,error:"网络没有连上，请下拉重试"}); finished(); }});
  }
,
  onShareAppMessage: function() {
    return { title: "徕舞女子塑形 · 我的课后手札", path: "/pages/brand/brand" };
  },
  onShareTimeline: function() {
    return { title: "徕舞女子塑形 · 身体掌权，终生优雅" };
  }
});
