/*************************************

项目名称: 华住会每日签到

说明: 华住会已把签到从老接口 hweb-mbf.huazhu.com/api/signIn
      (POST + User-Token 请求头) 迁移到新网关:
        GET https://appgw.huazhu.com/game/sign_in?date=<秒级时间戳>
      新接口只认 Cookie: userToken=<Token>，且老接口现在返回
      businessCode=600 "老签到已下线，请到新签到页面签到"。
      本脚本读取 huazhu.js 写入 $prefs 的 Token(huazhu_sso_token，
      即登录返回的 ssoToken，与 userToken 同值)完成每日签到，
      每天首次运行弹一次结果通知(去重，不重复打扰)。

依赖: 需与 huazhu.js 的 rewrite 规则配合获取 Token。
      用法: 配置文件 [task_local] 段添加(远程版):
      * * * * * https://raw.githubusercontent.com/yiqian987/quanx/main/huazhu_signin.js, tag=华住会签到
      或本地版(Scripts 目录放同名文件):
      * * * * * script-name=huazhu_signin, tag=华住会签到
      ※ 建议执行时间 0:10 左右(避开 0 点日切)，可自行改 cron。

*************************************/

var STORE_KEY = 'huazhu_sso_token';       // huazhu.js 写入的 Token
var META_KEY = 'huazhu_token_meta';       // 账号信息(JSON): name / memberID / mobile
var DONE_KEY = 'huazhu_signin_date';      // 已弹过通知的日期 YYYY-MM-DD

var UA = 'HUAZHU/ios/iPad/26.6.1/9.47.0/RNWEBVIEW';

var token = ($prefs.valueForKey(STORE_KEY) || '').trim();
var meta = {};
try { meta = JSON.parse($prefs.valueForKey(META_KEY) || '{}') || {}; } catch (e) { meta = {}; }

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function nowTime() {
  var d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

// GET 请求封装: 携带 userToken Cookie(新签到网关只认 cookie)
function httpGet(url) {
  return new Promise(function (resolve, reject) {
    $task.fetch({
      url: url,
      method: 'GET',
      headers: {
        'User-Agent': UA,
        'Client-Platform': 'APP-IOS',
        'Origin': 'https://cdn.huazhu.com',
        'Referer': 'https://cdn.huazhu.com/',
        'Cookie': 'userToken=' + token
      }
    }).then(function (resp) {
      try {
        resolve(JSON.parse(resp.body || '{}'));
      } catch (e) {
        reject(new Error('响应解析失败: ' + e + ' | ' + String(resp.body).slice(0, 120)));
      }
    }, function (err) {
      reject(new Error('请求失败: ' + (err && err.error ? err.error : err)));
    });
  });
}

function post(title, msg) {
  try {
    $notification.post(title, '', msg);
  } catch (e) {
    console.log('[华住会签到] 通知失败: ' + e);
  }
  console.log('[华住会签到] ' + title + ' | ' + msg);
}

function userName() {
  return meta.name ? meta.name + (meta.memberID ? '(' + meta.memberID + ')' : '') : '';
}

!(async function () {
  if (!token) {
    post('华住会签到', '未获取到Token\n请先在华住会App退出并重新登录一次');
    return;
  }
  var today = todayStr();

  // 当日已成功通知过 → 静默(防高频 cron 重复弹; 失败分支不写 DONE_KEY 不受影响)
  if ($prefs.valueForKey(DONE_KEY) === today) {
    console.log('[华住会签到] 今日已处理，跳过');
    return;
  }

  // 查今日签到状态: content.signToday / content.point(今日可得积分) / content.memberPoint
  var hd;
  try {
    hd = await httpGet('https://appgw.huazhu.com/game/sign_header?');
  } catch (e) {
    post('华住会签到', '状态查询失败\n' + e.message + '\n' + nowTime() + ' 稍后自动重试');
    return;
  }

  if (hd.code === 1003 || String(hd.businessCode) === '1003') {
    post('华住会签到', 'Token已失效\n请打开华住会App重新登录一次');
    return;
  }
  if (hd.code !== 200) {
    post('华住会签到', '状态查询异常\ncode=' + hd.code + ' ' + (hd.message || ''));
    return;
  }

  var c = hd.content || {};
  var out = { signResult: null, point: c.point, memberPoint: c.memberPoint, yearCount: c.yearSignInCount };

  if (c.signToday) {
    out.signResult = false; // 已签
  } else {
    // 执行签到: date 为秒级时间戳
    try {
      var si = await httpGet('https://appgw.huazhu.com/game/sign_in?date=' + Math.floor(Date.now() / 1000));
      if (si.code === 200 && si.content && si.content.signResult) {
        out.signResult = true;
        out.point = si.content.point;
        out.yearCount = si.content.yearSignInCount != null ? si.content.yearSignInCount : out.yearCount;
      } else if (si.code === 5004 || String(si.businessCode) === '5004') {
        out.signResult = false; // 实际已签(并发/日切)
      } else if (si.code === 1003 || String(si.businessCode) === '1003') {
        post('华住会签到', 'Token已失效\n请打开华住会App重新登录一次');
        return;
      } else {
        post('华住会签到', '签到失败\ncode=' + si.code + ' ' + (si.message || '') + '\n' + nowTime() + ' 稍后自动重试');
        return;
      }
    } catch (e) {
      post('华住会签到', '签到请求失败\n' + e.message + '\n' + nowTime() + ' 稍后自动重试');
      return;
    }
    // 补查一次总积分
    try {
      var hd2 = await httpGet('https://appgw.huazhu.com/game/sign_header?');
      if (hd2.code === 200 && hd2.content) {
        out.memberPoint = hd2.content.memberPoint;
        if (out.yearCount == null) out.yearCount = hd2.content.yearSignInCount;
      }
    } catch (e) { /* 总积分查不到不阻塞 */ }
  }

  var un = userName();
  var title = un ? '华住会签到 ' + un : '华住会签到';
  var msg = '';
  if (out.signResult === true) {
    msg += '✅ 签到成功 +' + (out.point != null ? out.point : '?') + ' 积分\n';
  } else {
    msg += '今日已签到\n';
  }
  msg += '当前积分: ' + (out.memberPoint != null ? out.memberPoint : '?') + '\n';
  if (out.yearCount != null) msg += '本年签到: ' + out.yearCount + ' 天\n';
  msg += '时间: ' + today + ' ' + nowTime();

  post(title, msg);

  // 记录当日已通知(错误分支不写，留待下次重试)
  $prefs.setValueForKey(today, DONE_KEY);
})().finally(function () {
  $done();
});
