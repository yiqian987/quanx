/*************************************

项目名称: 买单吧定位修复（iPad 无 GPS 死循环）

原理: iPad mini 无定位权限/无 GPS，会话里始终没有坐标
      → location.json 永不 POST → 服务端把请求 302 到 locating.html
      → locating.html 自身又依赖定位 → 死循环 / 加载失败。
      本规则接管 locating.html 响应，注入一个中转页，
      在页面内用同源 fetch 先 POST 坐标写进服务端会话，再跳回原页面。

[rewrite_local]
^https:\/\/creditcardapp\.bankcomm\.com\/catering\/locating\.html url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js
[mitm]
hostname = creditcardapp.bankcomm.com


⚠️ 维护提示（别删）: 本文件是「rewrite 资源 + 远程脚本」双用文件，
导入时整份会先过一遍 QX 资源解析器。文末 HTML 文档声明标签必须保持
「拼接写法」（见 DT 变量）。一旦源码里出现连续的文档声明字样，
解析器会判定「该链接返回为无效网页内容」并直接丢弃本文件。

*************************************/


var CITY_NO   = '1000';
var CITY_NAME = '北京';
var LAT = '39.91398958241706';
var LNG = '116.50666870332198';

var referer = ($request.url.match(/referer=([^&]*)/) || [])[1] || '';
var back = referer ? decodeURIComponent(referer) : '/catering/index.html';

var target = back;
if (!/^https?:/i.test(target)) {
  if (target.charAt(0) !== '/') {
    target = '/' + target;
  }
  target = 'https://creditcardapp.bankcomm.com' + target;
}

var payload = JSON.stringify({
  selCityNo: CITY_NO,
  selCityName: CITY_NAME,
  cityCode: CITY_NO,
  cityName: CITY_NAME,
  lat: LAT,
  lng: LNG
});

var js = 'var t=' + JSON.stringify(target) + ';'
  + 'var p=' + payload + ';'
  + 'fetch("/catering/api/user/location.json?_="+Date.now(),{'
  + 'method:"POST",'
  + 'headers:{"Content-Type":"application/json;charset=utf-8"},'
  + 'body:JSON.stringify(p)'
  + '}).then(function(){location.href=t;})'
  + '.catch(function(){location.href=t;});'
  + 'setTimeout(function(){location.href=t;},4000);';

var css = 'font-family:-apple-system;background:#f7f7f7;'
  + 'text-align:center;padding-top:40vh;color:#888;font-size:15px';

// 文档声明标签必须拆开拼接，否则资源解析器会判定本文件为网页
var DT = '<' + '!DOC' + 'TYPE html>';

var html = DT + '<html><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>Locating</title></head><body style="' + css + '">'
  + '<div>正在定位，请稍候…</div>'
  + '<scr' + 'ipt>' + js + '</scr' + 'ipt></body></html>';

$done({ body: html });
