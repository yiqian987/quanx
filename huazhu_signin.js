/*************************************

项目名称: 华住会每日签到（青龙 / Quantumult X 通用版）

说明: 华住会已把签到从老接口 hweb-mbf.huazhu.com/api/signIn
      (POST + User-Token 请求头) 迁移到新网关:
        GET https://appgw.huazhu.com/game/sign_in?date=<秒级时间戳>
      新接口只认 Cookie: userToken=<Token>，老接口返回
      businessCode=600 "老签到已下线，请到新签到页面签到"。
      本脚本读取 Token 完成每日签到，含同日去重、Token 失效提醒。

Token 来源(按优先级自动识别):
      1) 存储键 HZH_Token —— 与旧脚本 hzh.js 共用同一存储键，
         青龙(Node.js) 下存在 box.dat，QuanX 下存在 $prefs；
      2) 存储键 huazhu_sso_token —— huazhu.js(抓Token脚本)写入；
      3) 环境变量 HZH_TOKEN —— 青龙面板可直接添加该环境变量。
      若均无 → 提示需先抓 Token，不会乱签。

====================================
Quantumult X 配置(参考, 非必需):
[task_local]
10 0 * * * https://raw.githubusercontent.com/yiqian987/quanx/main/huazhu_signin.js, tag=华住会, enabled=true
====================================

青龙部署:
      1. 青龙面板 → 脚本管理 → 新建脚本(名称 huazhu_signin.js)，
         粘贴本文件全部内容保存；或复制本文件到青龙 scripts 目录。
      2. 依赖: 青龙默认已装 axios；本脚本 Node 分支用 got 与
         旧脚本 hzh.js 保持一致 —— 如未安装请到
         依赖管理 → Node 添加: got、iconv-lite、tough-cookie
      3. Token: 方式A(推荐) 面板 → 环境变量 → 新增 HZH_TOKEN=<Token>
                 方式B 在脚本同级目录的 box.dat 里写入
                        {"HZH_Token":"<Token>"}
                 (Token 即华住会App登录后 huazhu.js 抓到的 ssoToken)
      4. 定时任务 → 创建任务 → 命令填:
         task huazhu_signin.js
         cron 填: 10 0 * * *
         (如需推送到微信/钉钉等, 请另备青龙 notify 脚本 sendNotify.js,
          脚本检测到存在会自动调用)
      5. 手动「运行」验证。今天已签过 → 提示今日已签到+当前积分。

*************************************/

/* ============ Env 兼容层 (青龙 Node.js / QuanX / Surge / Loon / Shadowrocket) ============ */
function Env(name) {
  return new (function () {
    this.name = name || 'Env';
    this.data = null;
    this.dataFile = 'box.dat';
    this.startTime = new Date().getTime();

    this.getEnv = function () {
      if (typeof $environment !== 'undefined' && $environment['surge-version']) return 'Surge';
      if (typeof $environment !== 'undefined' && $environment['stash-version']) return 'Stash';
      if (typeof module !== 'undefined' && module.exports) return 'Node.js';
      if (typeof $task !== 'undefined') return 'Quantumult X';
      if (typeof $loon !== 'undefined') return 'Loon';
      if (typeof $rocket !== 'undefined') return 'Shadowrocket';
      return void 0;
    };
    this.isNode = function () { return this.getEnv() === 'Node.js'; };
    this.isQuanX = function () { return this.getEnv() === 'Quantumult X'; };

    /* ---- 存储: Node→box.dat 文件, QuanX→$prefs, Surge系→$persistentStore ---- */
    this.loaddata = function () {
      if (!this.isNode()) return {};
      try {
        var fs = require('fs'), path = require('path');
        var t = path.resolve(this.dataFile),
            e = path.resolve(process.cwd(), this.dataFile);
        var f = fs.existsSync(t) ? t : (fs.existsSync(e) ? e : null);
        if (!f) return {};
        return JSON.parse(fs.readFileSync(f)) || {};
      } catch (e) { return {}; }
    };
    this.writedata = function () {
      if (!this.isNode()) return;
      try {
        var fs = require('fs'), path = require('path');
        var t = path.resolve(this.dataFile),
            e = path.resolve(process.cwd(), this.dataFile);
        var f = fs.existsSync(t) ? t : (fs.existsSync(e) ? e : t);
        fs.writeFileSync(f, JSON.stringify(this.data));
      } catch (e) {}
    };
    this.getval = function (k) {
      switch (this.getEnv()) {
        case 'Surge': case 'Loon': case 'Stash': case 'Shadowrocket':
          return $persistentStore.read(k);
        case 'Quantumult X':
          return $prefs.valueForKey(k);
        case 'Node.js':
          this.data = this.loaddata(); return this.data ? this.data[k] : null;
        default: return null;
      }
    };
    this.setval = function (v, k) {
      switch (this.getEnv()) {
        case 'Surge': case 'Loon': case 'Stash': case 'Shadowrocket':
          return $persistentStore.write(v, k);
        case 'Quantumult X':
          return $prefs.setValueForKey(v, k);
        case 'Node.js':
          this.data = this.loaddata();
          if (this.data) { this.data[k] = v; this.writedata(); return true; }
          return false;
        default: return false;
      }
    };
    this.getdata = function (k) { return this.getval(k); };
    this.setdata = function (v, k) { return this.setval(v, k); };

    /* ---- HTTP: Node→got, QuanX→$task.fetch, Surge系→$httpClient ---- */
    this.request = function (opt) {
      return new Promise(function (resolve, reject) {
        opt = opt || {};
        opt.headers = opt.headers || {};
        var env = this.getEnv();
        if (env === 'Quantumult X') {
          $task.fetch(opt).then(function (r) {
            resolve({ statusCode: r.statusCode || r.status, headers: r.headers, body: r.body });
          }, function (e) { reject(new Error((e && e.error) ? e.error : e)); });
        } else if (env === 'Node.js') {
          var got;
          try {
            got = require('got');
          } catch (e) {
            reject(new Error('Node 环境缺少 got 依赖，请在青龙依赖管理添加: got'));
            return;
          }
          var params = { method: (opt.method || 'GET').toLowerCase(), headers: opt.headers };
          if (opt.body) params.body = opt.body;
          got(opt.url, params).then(function (r) {
            resolve({ statusCode: r.statusCode, headers: r.headers, body: r.body });
          }, function (e) {
            var r = e.response;
            if (r) resolve({ statusCode: r.statusCode, headers: r.headers, body: r.body });
            else reject(new Error(e.message || e));
          });
        } else {
          var http = $httpClient;
          var fn = ((opt.method || 'GET').toUpperCase() === 'POST') ? http.post : http.get;
          fn(opt, function (err, resp, body) {
            if (!err && resp) resolve({ statusCode: resp.statusCode || resp.status, headers: resp.headers, body: body });
            else reject(new Error(err || 'request failed'));
          });
        }
      }.bind(this));
    };
    this.get = function (url, headers) {
      return this.request({ url: url, method: 'GET', headers: headers });
    };

    /* ---- 通知: QuanX→$notify, Surge系→$notification.post, Node→console+sendNotify ---- */
    this.msg = function (title, subtitle, body) {
      title = title || this.name;
      switch (this.getEnv()) {
        case 'Surge': case 'Loon': case 'Stash': case 'Shadowrocket':
          try { $notification.post(title, subtitle, body); } catch (e) {}
          break;
        case 'Quantumult X':
          try { $notify(title, subtitle, body); } catch (e) { try { $notification.post(title, subtitle, body); } catch (e2) {} }
          break;
        case 'Node.js':
          console.log('\n==============📣 系统通知 ==============\n' + title + (subtitle ? '\n' + subtitle : '') + (body ? '\n' + body : ''));
          try { // 青龙 notify: 检测到 sendNotify.js 则自动推送
            var notify = require('./sendNotify');
            if (notify && notify.sendNotify) notify.sendNotify(title, subtitle ? subtitle + '\n' + body : body);
          } catch (e) {}
          break;
      }
    };
    this.log = function () {
      var args = Array.prototype.slice.call(arguments);
      console.log(args.join('\n'));
    };
    this.logErr = function (e, extra) {
      this.log('', '❗️' + this.name + ', 错误!', extra || '', (e && e.stack) ? e.stack : e);
    };
    this.done = function () {
      var el = ((new Date()).getTime() - this.startTime) / 1000;
      this.log('', '🔔' + this.name + ', 结束! 🕛 ' + el.toFixed(2) + ' 秒');
      if (this.isNode()) { /* 青龙由面板托管进程, 不主动 exit */ }
      else if (typeof $done !== 'undefined') { try { $done(); } catch (e) {} }
    };
  })();
}

/* ============ 业务逻辑 ============ */
const $ = new Env('华住会');
const TOKEN_KEYS = ['HZH_Token', 'huazhu_sso_token']; // 旧脚本键 / huazhu.js 键
const DONE_KEY = 'HZH_SignDate';                      // 当日已处理标记 YYYY-MM-DD
const UA = 'HUAZHU/ios/iPad/26.6.1/9.47.0/RNWEBVIEW';

function pickToken() {
  for (var i = 0; i < TOKEN_KEYS.length; i++) {
    var t = $.getdata(TOKEN_KEYS[i]);
    if (t && String(t).trim()) return String(t).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env.HZH_TOKEN) return process.env.HZH_TOKEN.trim();
  return '';
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function nowTime() {
  var d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function apiGet(path, token) {
  return $.get(path, {
    'User-Agent': UA,
    'Client-Platform': 'APP-IOS',
    'Origin': 'https://cdn.huazhu.com',
    'Referer': 'https://cdn.huazhu.com/',
    'Cookie': 'userToken=' + token
  }).then(function (r) {
    try { return JSON.parse(r.body || '{}'); }
    catch (e) { throw new Error('响应解析失败: ' + e + ' | ' + String(r.body).slice(0, 120)); }
  });
}

!(async function () {
  var token = pickToken();
  if (!token) {
    $.msg('华住会签到', '', '未获取到Token\n' +
      '青龙: 面板环境变量添加 HZH_TOKEN=<Token>，或 box.dat 写入 HZH_Token\n' +
      'QuanX: 先运行 huazhu.js 抓取规则并重新登录华住会App');
    $.done();
    return;
  }

  var today = todayStr();
  // 当日已成功处理 → 静默(防高频重复；失败分支不写标记可重试)
  if ($.getdata(DONE_KEY) === today) {
    $.log('🔕 今日已处理，跳过');
    $.done();
    return;
  }

  var hd, msg;
  try {
    hd = await apiGet('https://appgw.huazhu.com/game/sign_header?', token);
  } catch (e) {
    $.msg('华住会签到', '', '状态查询失败\n' + e.message + '\n' + nowTime() + ' 稍后自动重试');
    $.done();
    return;
  }

  if (hd.code === 1003 || String(hd.businessCode) === '1003') {
    $.msg('华住会签到', '', 'Token已失效\n请打开华住会App重新登录，更新 Token');
    $.done();
    return;
  }
  if (hd.code !== 200) {
    $.msg('华住会签到', '', '状态查询异常\ncode=' + hd.code + ' ' + (hd.message || ''));
    $.done();
    return;
  }

  var c = hd.content || {};
  var already = !!c.signToday;          // 查询时今日已签
  var didSign = false;                  // 本次实际调用了签到接口且成功
  var gotPoint = c.point;               // 今日签到可得积分
  var memberPoint = c.memberPoint, yearCount = c.yearSignInCount;

  if (!already) {
    // 执行签到: date 为秒级时间戳
    var si;
    try {
      si = await apiGet('https://appgw.huazhu.com/game/sign_in?date=' + Math.floor(Date.now() / 1000), token);
    } catch (e) {
      $.msg('华住会签到', '', '签到请求失败\n' + e.message + '\n' + nowTime() + ' 稍后自动重试');
      $.done();
      return;
    }
    if (si.code === 200 && si.content && si.content.signResult) {
      didSign = true;
      if (si.content.point != null) gotPoint = si.content.point;
      if (si.content.yearSignInCount != null) yearCount = si.content.yearSignInCount;
    } else if (si.code === 5004 || String(si.businessCode) === '5004') {
      already = true; // 实际已签(并发/日切)
    } else if (si.code === 1003 || String(si.businessCode) === '1003') {
      $.msg('华住会签到', '', 'Token已失效\n请打开华住会App重新登录，更新 Token');
      $.done();
      return;
    } else {
      $.msg('华住会签到', '', '签到失败\ncode=' + si.code + ' ' + (si.message || '') + '\n' + nowTime() + ' 稍后自动重试');
      $.done();
      return;
    }
    // 补查一次总积分
    try {
      var hd2 = await apiGet('https://appgw.huazhu.com/game/sign_header?', token);
      if (hd2.code === 200 && hd2.content) {
        memberPoint = hd2.content.memberPoint;
        if (yearCount == null) yearCount = hd2.content.yearSignInCount;
      }
    } catch (e) { /* 积分查不到不阻塞 */ }
  }

  if (didSign) {
    msg = '✅ 签到成功 +' + (gotPoint != null ? gotPoint : '?') + ' 积分\n';
  } else {
    msg = '今日已签到' + (gotPoint != null ? ' (+' + gotPoint + ' 积分)' : '') + '\n';
  }
  msg += '当前积分: ' + (memberPoint != null ? memberPoint : '?') + '\n';
  if (yearCount != null) msg += '本年签到: ' + yearCount + ' 天\n';
  msg += '时间: ' + today + ' ' + nowTime();

  $.msg('华住会签到', '', msg);
  // 记录当日已处理(仅成功路径)
  $.setdata(today, DONE_KEY);
  $.done();
})().catch(function (e) {
  $.logErr(e, '❌失败! 请重新登陆更新Token');
  $.done();
});
