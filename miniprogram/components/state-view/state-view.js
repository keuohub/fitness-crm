// components/state-view：统一 加载 / 空 / 报错 状态（BRIEF_06 §3）
var ICONS = ["wifi", "calendar", "leaf", "user", "card", "star"];
Component({
  properties: {
    type: { type: String, value: "empty" },
    theme: { type: String, value: "light" },
    icon: { type: String, value: "" },
    title: { type: String, value: "" },
    desc: { type: String, value: "" },
    actionText: { type: String, value: "" },
    compact: { type: Boolean, value: false }
  },
  data: { iconSrc: "" },
  observers: {
    "icon, theme, type": function(icon, theme, type) {
      var name = icon === "wifi-off" ? "wifi" : icon;
      if (!name && type === "error") name = "wifi";
      var src = ICONS.indexOf(name) >= 0 ? "/images/state/" + name + (theme === "dark" ? "-light" : "") + ".png" : "";
      this.setData({ iconSrc: src });
    }
  },
  methods: {
    onAction: function() {
      this.triggerEvent("action");
    }
  }
});
