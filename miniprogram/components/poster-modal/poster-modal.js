// components/poster-modal/poster-modal.js · 画报级体态美学分享卡组件
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    comparison: {
      type: Object,
      value: null
    },
    memberName: {
      type: String,
      value: "身体掌权者"
    },
    joinDays: {
      type: Number,
      value: 0
    },
    trainCount: {
      type: Number,
      value: 0
    }
  },

  data: {
    savingPoster: false
  },

  methods: {
    onClose: function() {
      this.triggerEvent("close");
    },

    noop: function() {},

    // 绘制并保存高清画报到手机相册
    savePosterToAlbum: function() {
      var that = this;
      if (that.data.savingPoster) return;
      try {
        if (wx.vibrateShort) wx.vibrateShort({ type: "medium" });
      } catch (err) {}

      that.setData({ savingPoster: true });
      wx.showLoading({ title: "正在雕刻画报...", mask: true });

      var query = that.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec(function(res) {
          if (!res || !res[0] || !res[0].node) {
            wx.hideLoading();
            that.setData({ savingPoster: false });
            wx.showToast({ title: "画报准备中，请重试", icon: "none" });
            return;
          }

          var canvas = res[0].node;
          var ctx = canvas.getContext('2d');
          var dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : (wx.getSystemInfoSync ? wx.getSystemInfoSync().pixelRatio : 2)) || 2;

          var W = 750;
          var H = 1260;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          ctx.scale(dpr, dpr);

          var memberName = that.data.memberName || "身体掌权者";
          var joinDays = that.data.joinDays || 0;
          var trainCount = that.data.trainCount || 0;
          var comp = that.data.comparison;
          var analysis = (comp && comp.analysis) ? comp.analysis : "锁骨舒展，骨盆中立回弹，自带松弛挺拔的大女主气场。";
          var photo1 = (comp && comp.photo1_url) ? comp.photo1_url : null;
          var photo2 = (comp && comp.photo2_url) ? comp.photo2_url : null;

          function drawRoundRect(x, y, w, h, r, fillColor, strokeColor, strokeWidth) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.lineTo(x + w, y + h - r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h);
            ctx.arcTo(x, y + h, x, y + h - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
            if (fillColor) {
              ctx.fillStyle = fillColor;
              ctx.fill();
            }
            if (strokeColor) {
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = strokeWidth || 1;
              ctx.stroke();
            }
          }

          function drawTextWrap(text, x, y, maxWidth, lineHeight, maxLines) {
            var line = '';
            var curY = y;
            var linesCount = 0;
            for (var i = 0; i < text.length; i++) {
              var testLine = line + text[i];
              var metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && i > 0) {
                linesCount++;
                if (maxLines && linesCount >= maxLines) {
                  ctx.fillText(line.slice(0, -1) + '...', x, curY);
                  return curY + lineHeight;
                }
                ctx.fillText(line, x, curY);
                line = text[i];
                curY += lineHeight;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, x, curY);
            return curY + lineHeight;
          }

          function downloadImg(url) {
            return new Promise(function(resolve) {
              if (!url) return resolve(null);
              if (url.indexOf("http") !== 0) return resolve(null);
              wx.downloadFile({
                url: url,
                success: function(dlRes) {
                  if (dlRes.statusCode === 200 && dlRes.tempFilePath) {
                    var img = canvas.createImage();
                    img.onload = function() { resolve(img); };
                    img.onerror = function() { resolve(null); };
                    img.src = dlRes.tempFilePath;
                  } else {
                    resolve(null);
                  }
                },
                fail: function() { resolve(null); }
              });
            });
          }

          function timeoutPromise(ms) {
            return new Promise(function(resolve) {
              setTimeout(function() { resolve(null); }, ms);
            });
          }

          Promise.all([
            Promise.race([downloadImg(photo1), timeoutPromise(3500)]),
            Promise.race([downloadImg(photo2), timeoutPromise(3500)])
          ]).then(function(images) {
            var img1 = images[0];
            var img2 = images[1];

            // 1. 底色：雅致温润的象牙米白
            ctx.fillStyle = "#F5EFEB";
            ctx.fillRect(0, 0, W, H);

            // 2. 主卡片容器
            var cardX = 40;
            var cardY = 48;
            var cardW = W - 80;
            var cardH = H - 96;
            drawRoundRect(cardX, cardY, cardW, cardH, 32, "#FCF8F5", "rgba(186, 36, 40, 0.12)", 2);

            // 3. 顶部品牌字
            ctx.textAlign = "center";
            ctx.fillStyle = "#120E0F";
            ctx.font = "bold 24px serif";
            ctx.fillText("身 体 掌 权 · 终 生 优 雅", W / 2, cardY + 68);

            ctx.fillStyle = "#8C6A6B";
            ctx.font = "18px sans-serif";
            ctx.fillText("徕 舞 · 私 人 体 态 美 学 档 案", W / 2, cardY + 102);

            // 细横线
            ctx.strokeStyle = "rgba(28, 20, 21, 0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cardX + 36, cardY + 128);
            ctx.lineTo(cardX + cardW - 36, cardY + 128);
            ctx.stroke();

            // 4. 会员姓名与自律天数
            ctx.textAlign = "left";
            ctx.fillStyle = "#1C1415";
            ctx.font = "bold 30px serif";
            ctx.fillText(memberName + " · 身体掌权者", cardX + 40, cardY + 178);

            ctx.textAlign = "right";
            ctx.fillStyle = "#BA2428";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("相伴自律 " + joinDays + " 天", cardX + cardW - 40, cardY + 178);

            // 5. 中间内容区：真实对比图 vs 高奢自律徽章
            var contentTop = cardY + 215;
            if (img1 && img2) {
              var pairW = (cardW - 80 - 18) / 2;
              var pairH = pairW * 4 / 3;

              ctx.save();
              drawRoundRect(cardX + 40, contentTop, pairW, pairH, 16, "#EAE3DE", null, 0);
              ctx.clip();
              ctx.drawImage(img1, cardX + 40, contentTop, pairW, pairH);
              ctx.restore();

              drawRoundRect(cardX + 50, contentTop + pairH - 42, 110, 32, 16, "rgba(8, 7, 10, 0.75)", null, 0);
              ctx.textAlign = "center";
              ctx.fillStyle = "#FFFFFF";
              ctx.font = "16px sans-serif";
              ctx.fillText("初见 · 蜕变前", cardX + 50 + 55, contentTop + pairH - 20);

              ctx.save();
              drawRoundRect(cardX + 40 + pairW + 18, contentTop, pairW, pairH, 16, "#EAE3DE", null, 0);
              ctx.clip();
              ctx.drawImage(img2, cardX + 40 + pairW + 18, contentTop, pairW, pairH);
              ctx.restore();

              drawRoundRect(cardX + 40 + pairW + 28, contentTop + pairH - 42, 110, 32, 16, "rgba(8, 7, 10, 0.75)", null, 0);
              ctx.textAlign = "center";
              ctx.fillStyle = "#FFFFFF";
              ctx.font = "16px sans-serif";
              ctx.fillText("当下 · 新生后", cardX + 40 + pairW + 28 + 55, contentTop + pairH - 20);

              contentTop += pairH + 34;
            } else {
              var badgeH = 260;
              drawRoundRect(cardX + 40, contentTop, cardW - 80, badgeH, 20, "rgba(245, 237, 232, 0.8)", "rgba(186, 36, 40, 0.18)", 1.5);

              ctx.textAlign = "center";
              ctx.fillStyle = "#BA2428";
              ctx.font = "38px sans-serif";
              ctx.fillText("✦", W / 2, contentTop + 72);

              ctx.fillStyle = "#1C1415";
              ctx.font = "bold 28px serif";
              ctx.fillText("身 心 觉 察 · 终 生 自 律", W / 2, contentTop + 128);

              ctx.fillStyle = "#8C6A6B";
              ctx.font = "20px sans-serif";
              ctx.fillText("累计完成 " + trainCount + " 次核心训练 · 岁月不负自律", W / 2, contentTop + 172);

              ctx.fillStyle = "rgba(28, 20, 21, 0.4)";
              ctx.font = "16px sans-serif";
              ctx.fillText("LAIWU PRIVATE PILATES & FITNESS", W / 2, contentTop + 210);

              contentTop += badgeH + 36;
            }

            // 6. 觉察金句框
            var quoteBoxW = cardW - 80;
            var quoteBoxH = 170;
            drawRoundRect(cardX + 40, contentTop, quoteBoxW, quoteBoxH, 18, "rgba(255, 255, 255, 0.85)", "rgba(28, 20, 21, 0.05)", 1);

            ctx.textAlign = "left";
            ctx.fillStyle = "#BA2428";
            ctx.font = "bold 38px Georgia, serif";
            ctx.fillText("“", cardX + 60, contentTop + 46);

            ctx.fillStyle = "#381617";
            ctx.font = "22px sans-serif";
            drawTextWrap(analysis, cardX + 96, contentTop + 48, quoteBoxW - 76, 36, 3);

            // 7. 底部落款与印章
            var footerY = cardY + cardH - 120;
            ctx.strokeStyle = "rgba(28, 20, 21, 0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cardX + 40, footerY);
            ctx.lineTo(cardX + cardW - 40, footerY);
            ctx.stroke();

            ctx.textAlign = "left";
            ctx.fillStyle = "#1C1415";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("小桥 · 专属私教手札", cardX + 40, footerY + 44);

            ctx.fillStyle = "#8C6A6B";
            ctx.font = "18px sans-serif";
            ctx.fillText("自律成骨骼，岁月即礼赞", cardX + 40, footerY + 76);

            var stampX = cardX + cardW - 120;
            var stampY = footerY + 12;
            var stampR = 40;
            ctx.save();
            ctx.translate(stampX + stampR, stampY + stampR);
            ctx.rotate(-10 * Math.PI / 180);
            ctx.beginPath();
            ctx.arc(0, 0, stampR, 0, Math.PI * 2);
            ctx.strokeStyle = "#BA2428";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, stampR - 4, 0, Math.PI * 2);
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.textAlign = "center";
            ctx.fillStyle = "#BA2428";
            ctx.font = "bold 18px serif";
            ctx.fillText("徕舞", 0, -5);
            ctx.fillText("私享", 0, 18);
            ctx.restore();

            // 8. 导出临时文件
            wx.canvasToTempFilePath({
              canvas: canvas,
              x: 0,
              y: 0,
              width: W,
              height: H,
              destWidth: W * 2,
              destHeight: H * 2,
              fileType: "png",
              quality: 1,
              success: function(tempRes) {
                that.doSaveImageToAlbum(tempRes.tempFilePath);
              },
              fail: function() {
                wx.hideLoading();
                that.setData({ savingPoster: false });
                wx.showToast({ title: "画报生成失败，请重试", icon: "none" });
              }
            });
          }).catch(function() {
            wx.hideLoading();
            that.setData({ savingPoster: false });
            wx.showToast({ title: "画报绘制异常", icon: "none" });
          });
        });
    },

    doSaveImageToAlbum: function(filePath) {
      var that = this;
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success: function() {
          wx.hideLoading();
          that.setData({ savingPoster: false });
          try {
            if (wx.vibrateShort) wx.vibrateShort({ type: "heavy" });
          } catch (e) {}
          wx.showToast({
            title: "已保存到手机相册",
            icon: "success",
            duration: 2500
          });
        },
        fail: function(saveErr) {
          wx.hideLoading();
          that.setData({ savingPoster: false });
          if (saveErr && (saveErr.errMsg.indexOf("auth deny") >= 0 || saveErr.errMsg.indexOf("authorize") >= 0)) {
            wx.showModal({
              title: "需要相册保存权限",
              content: "画报已制作完毕，请在设置中开启“添加到相册”权限以便保存",
              confirmText: "去开启",
              cancelText: "长按保存",
              success: function(mRes) {
                if (mRes.confirm) {
                  wx.openSetting();
                } else {
                  wx.previewImage({ urls: [filePath], current: filePath });
                }
              }
            });
          } else {
            wx.previewImage({
              urls: [filePath],
              current: filePath,
              success: function() {
                wx.showToast({ title: "长按图片即可保存到相册", icon: "none", duration: 3000 });
              }
            });
          }
        }
      });
    }
  }
});
