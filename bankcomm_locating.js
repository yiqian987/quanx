/*************************************

项目名称：买单吧无GPS设备定位修复（iPad mini 等）
使用声明：⚠️仅供参考，🈲转载与售卖！

原理：无GPS设备拿不到定位，会话无坐标导致页面跳
locating.html 死循环，最终「加载失败」。本脚本拦截
locating.html，整页替换为中转页，写入定位后跳回原页面。
坐标默认北京，可在脚本底部变量修改。

【一、响应改写规则】

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/locating\.html url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js

【二、MITM】

[mitm]
hostname = creditcardapp.bankcomm.com

*************************************/


var CITY_NO   = '1000';
var CITY_NAME = '北京';
var LAT = '39.91398958241706';
var LNG = '116.50666870332198';

var referer = ($request.url.match(/referer=([^&]*)/) || [])[1] || '';
var back = referer ? decodeURIComponent(referer) : '/catering/index.html';
var target = /^https?:/i.test(back)
  ? back
  : 'https://creditcardapp.bankcomm.com' + (back.indexOf('/') === 0 ? back : '/' + back);

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
  + 'fetch("/catering/api/user/location.json?_="+Date.now(),'
  + '{method:"POST",headers:{"Content-Type":"application/json;charset=utf-8"},body:JSON.stringify(p)})'
  + '.then(function(){location.href=t;})'
  + '.catch(function(){location.href=t;});'
  + 'setTimeout(function(){location.href=t;},4000);'
  + '</scr' + 'ipt></body></html>';

$done({ body: html });
