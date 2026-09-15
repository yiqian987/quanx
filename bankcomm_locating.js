/*************************************

项目名称: 买单吧定位修复（iPad 无 GPS 死循环）v13

原理（iPhone 对比实测，2026-09-14）:
      iPhone 每打开一个页面，页面 JS 都会自动 POST
      /catering/api/user/location.json 把坐标写进服务端会话
      （81 条请求里 8 次，全部 200，会话里一直有定位）。
      iPad 无 GPS，页面 JS 拿不到坐标，一次都不 POST，
      服务端会话里始终没有定位，于是：
        门店页 -> 302 -> locating.html -> 页面 JS 无坐标
             -> 跳 citySelector.html -> 服务端 302
             -> loaderror.html -> 整站白板
      本规则接管 locating.html：在服务端返回的真实页面里注入一段
      脚本，由 WebView 自己用 App 的 Cookie 同步 POST 定位（与
      iPhone 的原生行为完全一致），成功后跳回原页面并补上城市参数，
      让页面 JS 的 resovleLocation 直接命中，不再走 GPS 分支。
      另外顺手接管首页 index.html，只写定位不跳转，做到进 App 就
      先把定位备好（服务端定位会话寿命约 2~3 小时）。

      v13 关键发现（2026-09-14 20:52 真机 HAR）: 上面这套只打通了
      一半。"服务端会话里有定位"和"页面能正常渲染"是两个独立闸门:
        闸门 1 服务端: 会话无定位 -> 门店页 302 到 locating.html
        闸门 2 前端: SPA 的 bundle 要求 URL 的 query 里必须带
                    selCityNo / selCityName / lat / lng，读不到就
                    直接跳 citySelector.html -> 302 -> loaderror
      HAR 铁证（同一份 HAR、同一个会话）:
        #20 store/detail.html?storeId=..&selCityNo=1000&lat=.. 200
            页面正常渲染，后续 15 个 JSON 全 200
        #37 store/detail.html?storeId=..              200/16773B
            页面本身正常返回，但 SPA 立刻跳 citySelector -> loaderror
      差别只在 URL 有没有那 4 个城市参数。iPhone 有 GPS，页面 JS 拿到
      坐标后会自己把参数补进导航 URL；iPad 拿不到坐标 -> 裸 URL -> 白板。
      这也是"第一次能进、后面又不行"的原因: 第一次是被我们脚本拼好参数
      跳回去的，后面是 App 原生导航，全是裸 URL。
      所以 v13 再接管两个 SPA 页面入口，发现 URL 缺城市参数时，先同步
      写定位再 location.replace 到带参数的地址，与 iPhone 原生行为一致
      （iPhone 也是拿到 GPS 后 replace 一次）。URL 参数已齐就跳过，
      不会二次改写。

      离线实测（iPad 真实 Cookie）:
        无定位 GET 门店页  -> 302
        POST location.json -> LOCATION_SUCCESSFUL
        再 GET 门店页      -> 200 / 16773B

      相对 v11 的改动：v11 用 script-echo-response 配 $httpClient
      异步 POST，真机实测产出的是 0 字节空响应（HAR 里表现为
      Content-Length 0 + text/plain + statusText OK，无 Server），
      页面直接白板。v12 改为 script-response-body 注入，POST 交给
      WebView 自己发，同域自带 Cookie，最坏情况也只是回到原来。

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/locating\.html url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/store\/detail\.html url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/search\.html url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/index\.html url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/bankcomm_locating.js

四条规则互不重叠，且都不匹配 /catering/api/，与 redfriday.js 无冲突。
门店页被服务端 302 到 locating.html 时没有 body，会自动落到异常分支原样放行。

[mitm]
hostname = creditcardapp.bankcomm.com

v12.1 两个真 bug 修复（都是会让定位写不进去的硬伤）:
      1) 同步 XHR 不能设 timeout。规范规定同步请求设置 timeout 会抛
         InvalidAccessError，一抛 POST 就发不出去，等于没修。现在
         只在异步分支设 timeout，同步失败退 navigator.sendBeacon。
      2) 注入点插在 <head> 之后、<meta charset> 之前，此时浏览器还
         没确定编码，body 里的中文会乱码。现在整段注入脚本做纯
         ASCII 化（中文转 \uXXXX），保证任何编码下都能正确解析。

维护提示: 本文件是 rewrite 资源 + 远程脚本 双用文件。全文只允许
      一对块注释（就是包住本段的那一对）；任何一行不得超过 340
      字符；源码里不得出现连续的 HTML 文档声明字样，否则资源
      解析器会判为网页并丢弃整个文件。任何异常都必须原样放行，
      绝不能产出空 body。

*************************************/


var HOME = 'https://creditcardapp.bankcomm.com';
var LOC = HOME + '/catering/api/user/location.json';
var CITY_NO = '1000';
var CITY_NAME = '北京';
var LAT = '39.91398958241706';
var LNG = '116.50666870332198';
var MAX_ROUND = 2;

function getParam(s, name) {
  var m = String(s).match(new RegExp('[?&]' + name + '=([^&]*)'));
  if (!m) return '';
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

// 轮次：首次进 locating.html 时自身没有标记，要从 referer 里读
// （referer 是编码过的，_qxloc=1 里的等号会变成 %3D）
function currentRound() {
  var v = getParam($request.url, '_qxloc');
  if (!v) {
    var ref = getParam($request.url, 'referer');
    var m = String(ref).match(/_qxloc(?:%3D|=)(\d+)/i);
    v = m ? m[1] : '0';
  }
  return parseInt(v, 10) || 0;
}

function buildTarget(round) {
  var t = getParam($request.url, 'referer') || '/catering/index.html';
  if (!/^https?:/i.test(t)) {
    t = HOME + (t.charAt(0) === '/' ? '' : '/') + t;
  }
  t = t.replace(/([?&])_qxloc=[^&]*/g, '$1');
  t = t.replace(/[?&]$/, '');
  var sep = t.indexOf('?') >= 0 ? '&' : '?';
  t = t + sep + 'selCityNo=' + CITY_NO
    + '&selCityName=' + encodeURIComponent(CITY_NAME)
    + '&lat=' + LAT + '&lng=' + LNG + '&_qxloc=' + round;
  return t;
}

// 门店页/搜索页这类 SPA 页面，bundle 会要求 URL 里带城市四参数。
// 只要缺一个就判定为裸 URL，需要补参数跳转。
function needParams() {
  return !getParam($request.url, 'selCityNo') || !getParam($request.url, 'lat');
}

// 基于当前 URL 自身拼出带参数的地址（不重复追加已有的同名参数）
function buildSelfTarget(round) {
  var t = String($request.url).replace(/([?&])_qxloc=[^&]*/g, '$1');
  t = t.replace(/[?&]$/, '');
  var add = [
    ['selCityNo', CITY_NO],
    ['selCityName', encodeURIComponent(CITY_NAME)],
    ['lat', LAT],
    ['lng', LNG]
  ];
  for (var i = 0; i < add.length; i++) {
    if (!getParam(t, add[i][0])) {
      t = t + (t.indexOf('?') >= 0 ? '&' : '?') + add[i][0] + '=' + add[i][1];
    }
  }
  return t + (t.indexOf('?') >= 0 ? '&' : '?') + '_qxloc=' + round;
}

function payload() {
  return JSON.stringify({
    selCityNo: CITY_NO,
    selCityName: CITY_NAME,
    cityCode: CITY_NO,
    cityName: CITY_NAME,
    lat: LAT,
    lng: LNG
  });
}

// 注入脚本会插在 <head> 之后，而 <meta charset> 在其后，此时浏览器
// 还没确定编码，中文可能乱码。把非 ASCII 全转成 \uXXXX 保证纯 ASCII。
function ascii(str) {
  return String(str).replace(/[^\x00-\x7f]/g, function (c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}

// 注入进页面的浏览器脚本：写定位（同域自带 App Cookie）再跳。
// locating.html 用同步 XHR，抢在 SPA 的 app.js 执行前写完，避免它先
// 跳去 citySelector 触发 loaderror 死循环；首页用异步，不阻塞渲染。
// 注意：同步 XHR 不能设 timeout（规范规定会抛 InvalidAccessError，
// 一抛 POST 就发不出去），所以只在异步分支设。同步失败退 sendBeacon。
function injectCode(target, round, useAsync) {
  var p = [];
  var body = ascii(payload());
  p.push('<scr' + 'ipt>');
  p.push('(function(){');
  p.push('var r=' + round + ',t=' + JSON.stringify(target) + ';');
  p.push('if(r>=' + MAX_ROUND + ')return;');
  p.push('try{var x=new XMLHttpRequest();');
  p.push('x.open("POST","' + LOC + '?_="+Date.now(),' + (useAsync ? 'true' : 'false') + ');');
  p.push('x.setRequestHeader("Content-Type",');
  p.push('"application/json;charset=utf-8");');
  if (useAsync) { p.push('x.timeout=5000;'); }
  p.push('x.send(\'' + body + '\');}catch(e){');
  p.push('try{navigator.sendBeacon("' + LOC + '",');
  p.push('new Blob([\'' + body + '\'],');
  p.push('{type:"application/json"}));}catch(e2){}}');
  p.push('if(t)location.replace(t);');
  p.push('})();');
  p.push('</scr' + 'ipt>');
  return p.join('');
}

(function () {
  var body = ($response && $response.body) || '';
  var out = body;
  try {
    if (body && /<head/i.test(body)) {
      var round = currentRound();
      if (round < MAX_ROUND) {
        var isLoc = /\/catering\/locating\.html/.test($request.url);
        var isPage = /\/catering\/(store\/detail|search)\.html/.test($request.url);
        var target = '';
        var useAsync = false;
        var skip = false;
        if (isLoc) {
          // 服务端把门店页踢过来的：写完定位跳回 referer 原页
          target = buildTarget(round + 1);
        } else if (isPage) {
          // 门店页/搜索页：URL 缺城市四参数就补一次；已齐全直接放行
          if (needParams()) { target = buildSelfTarget(round + 1); }
          else { skip = true; }
        } else {
          // 首页等其它页面：只异步预热定位，不跳转也不阻塞渲染
          useAsync = true;
        }
        if (!skip) {
          var code = injectCode(target, round, useAsync);
          out = body.replace(/<head([^>]*)>/i, '<head$1>' + code);
          if (out === body) { out = code + body; }
        }
      }
    }
  } catch (e) {
    out = body;
  }
  $done({ body: out });
})();
