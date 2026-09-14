/*************************************

项目名称: 买单吧定位修复（iPad 无 GPS 死循环）

原理: iPad 无 GPS -> 页面 JS 拿不到定位 -> 服务端把页面 302 到
      locating.html -> 该页又跳 citySelector -> 服务端再 302 到
      loaderror，整站加载失败（门店/商品/活动页全白）。
      本规则接管 locating.html：先用 App 自己的 Cookie 把北京定位
      写进服务端会话，再 302 回原页面；同时补上城市参数，让页面 JS
      的 resovleLocation 直接命中，不再走 GPS 分支。

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/locating\.html url script-echo-response https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js

[mitm]
hostname = creditcardapp.bankcomm.com

维护提示: 本文件是「rewrite 资源 + 远程脚本」双用文件。全文只允许
      一对块注释（就是包住本段的那一对）；任何一行不得超过 340 字符；
      源码里不得出现连续的 HTML 文档声明字样，否则资源解析器会判为
      网页并丢弃整个文件。

*************************************/


var HOME = 'https://creditcardapp.bankcomm.com';
var LOC_API = HOME + '/catering/api/user/location.json';
var CITY_NO = '1000';
var CITY_NAME = '北京';
var LAT = '39.91398958241706';
var LNG = '116.50666870332198';
var DONE = false;

function finish(obj) {
  if (DONE) return;
  DONE = true;
  $done(obj);
}

function pickHeader(name) {
  var h = ($request && $request.headers) || {};
  var low = name.toLowerCase();
  var keys = Object.keys(h);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === low) return h[keys[i]];
  }
  return '';
}

function decode(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

function stripMark(t) {
  // 去掉上一回合留下的标记，避免参数叠加
  t = t.replace(new RegExp(markRe, 'ig'), '$1');
  t = t.replace(/\?&/g, '?').replace(/&&/g, '&').replace(/[?&]$/, '');
  return t;
}

function buildTarget(round) {
  var m = ($request.url.match(/referer=([^&]*)/) || [])[1] || '';
  var t = decode(m) || '/catering/index.html';
  if (!/^https?:/i.test(t)) {
    t = HOME + (t.charAt(0) === '/' ? '' : '/') + t;
  }
  var hash = '';
  var hi = t.indexOf('#');
  if (hi >= 0) { hash = t.slice(hi); t = t.slice(0, hi); }
  t = stripMark(t);
  var sep = t.indexOf('?') >= 0 ? '&' : '?';
  if (t.indexOf('selCityNo=') < 0) {
    t += sep + 'selCityNo=' + CITY_NO
      + '&selCityName=' + encodeURIComponent(CITY_NAME)
      + '&lat=' + LAT + '&lng=' + LNG;
    sep = '&';
  }
  t += sep + '_qxloc=' + round;
  return t + hash;
}

function fail(msg) {
  var html = '<html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '</head><body style="font-family:-apple-system;text-align:center;'
    + 'padding-top:40vh;color:#888;font-size:15px">' + msg
    + '</body></html>';
  finish({
    status: 'HTTP/1.1 200 OK',
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    body: html
  });
}

function redirectTo(url) {
  finish({
    status: 'HTTP/1.1 302 Found',
    headers: {
      'Location': url,
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store'
    },
    body: ''
  });
}

// 回合数：0 = 首次拦截；1 = 补过一次（会话过期时会走到这里，允许再补一次）；
// 2 = 连补两次仍被弹回，说明写不进去，不再重定向，避免死循环。
// 注意：referer 是 URL 编码过的，标记里的 "=" 会变成 "%3D"，两种都要认。
var markRe = '([?&])_qxloc(?:=|%3D)\\d+';
var ROUND = parseInt((($request.url.match(/_qxloc(?:%3D|=)(\d+)/i) || [])[1] || '0'), 10) || 0;
var target = buildTarget(ROUND + 1);

if (ROUND >= 2) {
  fail('定位写入未生效，请完全退出 APP 后重进');
} else {
  var body = JSON.stringify({
    selCityNo: CITY_NO,
    selCityName: CITY_NAME,
    cityCode: CITY_NO,
    cityName: CITY_NAME,
    lat: LAT,
    lng: LNG
  });
  $httpClient.post({
    url: LOC_API + '?_=' + Date.now(),
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Accept': 'application/json',
      'Origin': HOME,
      'Referer': target,
      'Cookie': pickHeader('Cookie')
    },
    body: body
  }, function (err, resp, data) {
    if (!err && data && String(data).indexOf('LOCATION_SUCCESSFUL') >= 0) {
      redirectTo(target);
    } else {
      fail('定位写入失败，请完全退出 APP 后重进');
    }
  });
}
