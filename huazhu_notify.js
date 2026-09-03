/*************************************

项目名称: 华住会 Token 通知(轮询推送)

说明: Quantumult X 所有脚本环境(rewrite 与 task)均【没有】
      $notification 对象 —— 实测直接调用会抛
      ReferenceError: Can't find variable: $notification。
      弹横幅统一用全局函数 $notify(title, subtitle, message)
      (写法与 XiaoMao 系脚本一致)。
      rewrite 环境因不能 $notify 且无网络回调，不适合弹窗，
      故本脚本每分钟轮询一次 huazhu.js 写入 $prefs 的 Token，
      发现【新的】Token 即用 $notify 弹出通知，
      已通知过的 Token 不会重复弹。

用法: 配置文件 [task_local] 段添加(需与 huazhu.js 的 rewrite 规则配合):
      * * * * * https://raw.githubusercontent.com/yiqian987/quanx/main/huazhu_notify.js, tag=华住会Token通知
      或本地版(Scripts 目录放同名文件):
      * * * * * script-name=huazhu_notify, tag=华住会Token通知

*************************************/

var STORE_KEY = 'huazhu_sso_token';         // huazhu.js 写入的 Token
var META_KEY = 'huazhu_token_meta';         // huazhu.js 写入的账号信息(JSON)
var NOTIFIED_KEY = 'huazhu_notified_token'; // 已通知过的 Token

var token = ($prefs.valueForKey(STORE_KEY) || '').trim();
var notified = $prefs.valueForKey(NOTIFIED_KEY) || '';

if (token && token !== notified) {
  // 解析账号信息
  var meta = {};
  try { meta = JSON.parse($prefs.valueForKey(META_KEY) || '{}') || {}; } catch (e) { meta = {}; }
  var name = meta.name || '';
  var memberID = meta.memberID || '';
  var mobile = meta.mobile || '';

  var flag = notified ? 'Token已更新' : '首次捕获';

  // 当前时间(弹窗即本次捕获)
  var now = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var time = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
             ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

  var subtitle = flag + (name ? ' ' + name : '') + (memberID ? ' (' + memberID + ')' : '');
  var msg = '';
  if (name) msg += '会员: ' + name + '\n';
  if (mobile) msg += '手机: ' + mobile + '\n';
  if (memberID) msg += '会员号: ' + memberID + '\n';
  msg += '时间: ' + time + '\n';
  msg += '请长按通知点「拷贝」复制 Token\n';
  msg += token;

  // 弹横幅通知: QuanX 脚本环境一律用全局函数 $notify
  // ($notification 对象不存在, 直接调会 ReferenceError)
  var notified = false;
  try {
    if (typeof $notify === 'function') {
      $notify('华住会 Token', subtitle, msg);
      notified = true;
    }
  } catch (e) { notified = false; }
  if (!notified) {
    try { if (typeof $notification !== 'undefined') { $notification.post('华住会 Token', subtitle, msg); notified = true; } } catch (e2) {}
  }
  if (!notified) {
    // 通知API彻底不可用: 至少 console 留痕, 不静默
    console.log('[华住会] 通知API不可用, 本次 Token 已存入存储:\n' + subtitle + '\n' + msg);
  }

  // 记录已通知，防止下一分钟重复弹
  $prefs.setValueForKey(token, NOTIFIED_KEY);
  console.log('[华住会] 已通知新 Token: ' + token);
}

$done();
