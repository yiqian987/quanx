/*************************************

项目名称：买单吧无GPS设备定位修复（iPad mini 等「加载失败」死循环）
使用声明：⚠️仅供参考，🈲转载与售卖！

原理说明（2026-09-13 iPad mini HAR 实测）：
无GPS设备进 catering 页面的死循环链：
  store/product detail.html（服务端会话无定位）
    → 302 /catering/locating.html（等HTML5/APP定位）
    → 定位拿不到（Wi-Fi版iPad无GPS）
    → citySelector.html → 302 loaderror.html「加载失败」
  全程无 location.json POST。定位是服务端会话状态，URL带坐标无效
  （Mac curl 对照实验证实：同会话 POST location.json 后 detail.json 即放行）。

修复方案（踩坑记录）：
  v1: url echo-response + 远程URL → QuanX 解析器报 invalid line（echo-response 只接受内联文本）
  v2: url script-echo-response + $done({status:302}) → 页面白板（status 必须是完整状态行字符串，数字无效）
  v3: 结构错误——注释提前闭合，规则段裸露在 JS 里导致远程引用语法报错
  v4: url script-response-body 整页替换为中转页 → 页面 JS 同源 POST location.json（自动带 Cookie）
      → location.href 跳回原页面。结构与 redfriday.js 完全一致（单注释包裹全部段落）。

坐标默认北京（city_code=1000，与抢购目标城市一致），见底部变量可改。

【一、响应改写规则：拦截 locating.html，整页替换为中转页】

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/locating\.html url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js

【二、MITM】

[mitm]
hostname = creditcardapp.bankcomm.com

使用姿势（iPad 等无GPS设备）：
1. QuanX 重写-引用 导入本文件（与 redfriday.js 同款结构，导入自动合并规则和 MITM）
2. 打开买单吧任意门店/商品页 → 中转页闪现「正在定位」→ 自动写入定位并跳回 → 正常加载
3. 需要改城市/坐标时，修改脚本底部 CITY_NO/CITY_NAME/LAT/LNG 四个变量

回滚：删掉本条重写规则即恢复原行为。

*************************************/


// ===== 坐标配置：默认北京（city_code=1000，与抢购目标城市一致）=====
var CITY_NO   = '1000';
var CITY_NAME = '北京';
var LAT = '39.91398958241706';
var LNG = '116.50666870332198';

// ===== 从 locating.html?referer=xxx 解析原页面路径（iPad HAR 实测参数名为 referer）=====
var referer = ($request.url.match(/referer=([^&]*)/) || [])[1] || '';
var back = referer ? decodeURIComponent(referer) : '/catering/index.html';
var target = /^https?:/i.test(back)
  ? back
  : 'https://creditcardapp.bankcomm.com' + (back.indexOf('/') === 0 ? back : '/' + back);

// ===== 中转页：页面 JS 同源 POST location.json（WebView 自动带当前会话 Cookie），成功后跳回原页面 =====
var html = '<!DOCTYPE html><html><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">'
  + '<title>正在定位</title></head>'
  + '<body style="font-family:-apple-system;background:#f7f7f7;text-align:center;padding-top:40vh;color:#888;font-size:15px">'
  + '<div>正在定位，请稍候…</div>'
  + '<scr' + 'ipt>'
  + 'var t=' + JSON.stringify(target) + ';'
  + 'var p={selCityNo:' + JSON.stringify(CITY_NO) + ',selCityName:' + JSON.stringify(CITY_NAME)
  + ',cityCode:' + JSON.stringify(CITY_NO) + ',cityName:' + JSON.stringify(CITY_NAME)
  + ',lat:' + JSON.stringify(LAT) + ',lng:' + JSON.stringify(LNG) + '};'
  // fetch 成功或失败都跳转；再加 4 秒兜底，防止 fetch 挂起导致停留
  + 'fetch("/catering/api/user/location.json?_="+Date.now(),'
  + '{method:"POST",headers:{"Content-Type":"application/json;charset=utf-8"},body:JSON.stringify(p)})'
  + '.then(function(){location.href=t;})'
  + '.catch(function(){location.href=t;});'
  + 'setTimeout(function(){location.href=t;},4000);'
  + '</scr' + 'ipt></body></html>';

$done({ body: html });
