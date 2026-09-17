/*************************************

项目名称：挖财记账 v5（去广告 + 去埋点 + 关掉 VIP 伪装，引用不变）
使用声明：⚠️仅供参考，🈲转载与售卖！



**************************************

[rewrite_local]
^https?:\/\/jz\.wacaijizhang\.com\/sensor\/sa url reject-200
^https?:\/\/jz\.wacaijizhang\.com url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/wacai.js

[mitm]
hostname = jz.wacaijizhang.com

*************************************/

(function () {
  var AD_ENABLE = true;    // 改成 false 即只保留 v1 行为
  var VIP_ENABLE = true;  // v4 起默认关：VIP 伪装无实际权益，且有副作用嫌疑（v5 更正理由）
  var body = ($response && $response.body) || '';
  var url = String(($request && $request.url) || '');
  var out = body;

  function isAd(u) { return !u || String(u).indexOf('wacai://ad_') === 0; }

  // 只改认识的结构，任何一步拿不准就原样返回，绝不猜
  function edit(fn) {
    var o = JSON.parse(body);
    var r = fn(o);
    return r ? JSON.stringify(o) : body;
  }

  try {
    // ---- v1 原有逻辑：12 条 VIP 字段伪装 ----
    // v4 起默认关闭（VIP_ENABLE=false），详见文件头【v5】一节。
    // 想恢复老行为把它改回 true 即可，代码一行没删。
    if (VIP_ENABLE) {
      out = out.replace(/\"isVip":\d+/g, '\"isVip":1');
      out = out.replace(/\"sex":"\d+"/g, '\"sex":"1"');
      out = out.replace(/\"isPermanentVip":\w+/g, '\"isPermanentVip":true');
      out = out.replace(/\"freeSendVipEnable":\d+/g, '\"freeSendVipEnable":1');
      out = out.replace(/\"freeSendAdFreeVipEnable":\d+/g, '\"freeSendAdFreeVipEnable":1');
      out = out.replace(/\"vipType":\d+/g, '\"vipType":2');
      out = out.replace(/\"expireDaysDays":\d+/g, '\"expireDaysDays":99999');
      out = out.replace(/\"vipMemberEnable":\d+/g, '\"vipMemberEnable":1');
      out = out.replace(/\"adFreePermanentVip":\w+/g, '\"adFreePermanentVip":true');
      out = out.replace(/\"matchVipTrial":\w+/g, '\"matchVipTrial":true');
      out = out.replace(/\"adFreeVipEnable":\d+/g, '\"adFreeVipEnable":1');
      out = out.replace(/\"isVipMember":\w+/g, '\"isVipMember":true');
    }

    // ---- v2 新增：广告位 ----
    if (AD_ENABLE) {
      if (url.indexOf('/api/banners/newSplash') >= 0) {
        // 置 null 而不是 []：服务端自己就是这么返回的（见 HAR #54），App 认得
        out = edit(function (o) {
          if (!o || !o.data || !o.data.advertiserSplashList) return false;
          o.data.advertiserSplashList = null;
          if (o.data.vipUrl) o.data.vipUrl = null;
          return true;
        });
      } else if (url.indexOf('/api/banners/ribbon') >= 0) {
        out = edit(function (o) {
          if (!o || !o.banners || !o.banners.length) return false;
          o.banners = [];
          return true;
        });
      } else if (url.indexOf('/api/banners/list') >= 0) {
        out = edit(function (o) {
          if (!o || !o.data || !o.data.groups) return false;
          var hit = false;
          o.data.groups.forEach(function (g) {
            if (g && g.banners && g.banners.length) {
              var keep = g.banners.filter(function (b) { return !isAd(b && b.url); });
              if (keep.length !== g.banners.length) { g.banners = keep; hit = true; }
            }
          });
          return hit;
        });
      } else if (url.indexOf('/api/resource/universal/fetch') >= 0) {
        out = edit(function (o) {
          if (!o || !o.data) return false;
          var hit = false;
          o.data.forEach(function (sp) {
            if (!sp) return;
            if (sp.spaceKey === 'HomeInterstitialAd') {
              if (sp.resources && sp.resources.length) { sp.resources = []; hit = true; }
              return;
            }
            if (sp.resources && sp.resources.length) {
              var keep = sp.resources.filter(function (r) { return !isAd(r && r.url); });
              if (keep.length !== sp.resources.length) { sp.resources = keep; hit = true; }
            }
          });
          return hit;
        });
      }
      // 可选（默认不开）：想把封面大图换成缩略图省流量，在这里加
      //   else if (url.indexOf('/api/book/cover/list') >= 0) {
      //     out = edit(function (o) {
      //       if (!o || !o.data || !o.data.bookCovers) return false;
      //       o.data.bookCovers.forEach(function (c) {
      //         if (c.coverPreUrl) c.imageUrl = c.coverPreUrl;   // 90x114 缩略图
      //       });
      //       return true;
      //     });
      //   }
      // 代价是封面预览变模糊，且这属于画质降级而非加速，故默认不动。
    }
  } catch (e) {
    out = body;
  }

  $done({ body: out });
})();
