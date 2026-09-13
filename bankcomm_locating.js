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
  （22:2x Mac curl 对照实验证实：同会话 POST location.json 后 detail.json 即放行）。

本脚本拦截 GET /catering/locating.html：
  1. 用当前会话 Cookie 直接 POST /catering/api/user/location.json 写入固定坐标
  2. 302 回 referer 原页面（会话已有定位，服务端放行）

坐标默认北京（city_code=1000，与抢购目标城市一致），见底部变量可改。

*************************************/

【一、echo-response 规则：拦截 locating.html，写入定位后跳回原页面】

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/locating\.html url echo-response https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js

【二、MITM】

[mitm]
hostname = creditcardapp.bankcomm.com

使用姿势（iPad 等无GPS设备）：
1. QuanX 导入本文件为重写资源（或手动复制【一】规则到 [rewrite_local]）
2. MITM 已含 creditcardapp.bankcomm.com（与 redfriday.js 相同，导入会合并）
3. 打开买单吧任意门店/商品页 → 自动写入定位 → 正常加载，不再跳「加载失败」
4. 需要改城市/坐标时，修改脚本底部 CITY_NO/CITY_NAME/LAT/LNG 四个变量

回滚：删掉本条 rewrite 规则即恢复原行为。

*************************************/


// 坐标配置：默认北京（city_code=1000，与抢购目标城市一致）
var CITY_NO   = '1000';
var CITY_NAME = '北京';
var LAT = '39.91398958241706';
var LNG = '116.50666870332198';

// 从 locating.html?referer=xxx 解析原页面路径
var referer = ($request.url.match(/referer=([^&]*)/) || [])[1] || '';
var back = referer ? decodeURIComponent(referer) : '/catering/';
var target = /^https?:/i.test(back)
  ? back
  : 'https://creditcardapp.bankcomm.com' + (back.indexOf('/') === 0 ? back : '/' + back);

// 取当前请求的会话 Cookie（MITM 解密后可见）
var h = $request.headers || {};
var cookie = h['Cookie'] || h['cookie'] || '';
var ua = h['User-Agent'] || h['user-agent'] || '';

$task.fetch({
  url: 'https://creditcardapp.bankcomm.com/catering/api/user/location.json',
  method: 'POST',
  headers: {
    'User-Agent': ua,
    'Cookie': cookie,
    'Content-Type': 'application/json;charset=utf-8',
    'Origin': 'https://creditcardapp.bankcomm.com',
    'Referer': target
  },
  body: JSON.stringify({
    selCityNo: CITY_NO, selCityName: CITY_NAME,
    cityCode: CITY_NO, cityName: CITY_NAME,
    lat: LAT, lng: LNG
  })
}).then(function (res) {
  console.log('[locating-fix] location.json -> ' + res.statusCode + ' ' + (res.body || '').substring(0, 80));
  $done({ status: 302, headers: { Location: target } });
}, function (err) {
  console.log('[locating-fix] POST 失败，仍放行回原页: ' + err);
  $done({ status: 302, headers: { Location: target } });
});
