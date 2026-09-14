/*************************************

项目名称: 买单吧定位修复

**************************************

[rewrite_local]
^https:\/\/creditcardapp\.bankcomm\.com\/catering\/locating\.html url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js
[mitm]
hostname = creditcardapp.bankcomm.com

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

var html = '<!DOCTYPE html><html><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>Locating</title></head><body style="' + css + '">'
  + '<div>正在定位，请稍候…</div>'
  + '<scr' + 'ipt>' + js + '</scr' + 'ipt></body></html>';

$done({ body: html });
