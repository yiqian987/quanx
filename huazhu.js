/*************************************

项目名称: 华住会 Token

说明: 拦截华住会登录接口响应，解析 content.ssoToken，
      通知栏弹出 Token，长按通知点「拷贝」即可复制。
      响应内容原样透传，不做任何修改。

用法: 将下方 [rewrite_local] 规则与 [mitm] 主机名
      粘贴进 Quantumult X 配置文件，脚本按远程地址自动拉取。
      然后在华住会 App 内完成一次登录即可触发。

**************************************

[rewrite_local]
^https:\/\/hweb-personalcenter\.huazhu\.com\/login\/login url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/huazhu.js
[mitm]
hostname = hweb-personalcenter.huazhu.com

*************************************/

// 需要保存的 Token 键
var STORE_KEY = 'huazhu_sso_token';
var META_KEY = 'huazhu_token_meta';

var body = $response.body;

try {
  var obj = JSON.parse(body);
  var content = obj.content || {};

  // 仅处理登录成功: businessCode == "1000"，Token 在 content.ssoToken
  var token = content.ssoToken || content.refreshToken || content.token || '';
  if (String(obj.businessCode || '') === '1000' && token) {

    var oldToken = $prefs.valueForKey(STORE_KEY) || '';

    // 持久化 Token 与账号信息，供复显/后续调用
    $prefs.setValueForKey(token, STORE_KEY);
    $prefs.setValueForKey(JSON.stringify({
      name: content.name || '',
      memberID: content.memberID || content.memberId || '',
      mobile: content.mobile || ''
    }), META_KEY);

    // 提示文案区分首次 / 更新 / 重新登录
    var flag = (oldToken && oldToken !== token) ? 'Token已更新' : (oldToken ? '重新登录' : '首次捕获');

    // 当前时间 年-月-日 时:分
    var now = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var time = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
               ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

    // 通知标题/副标题/正文（正文最后一行是 Token，方便长按拷贝）
    var title = '华住会 Token';
    var subtitle = flag + (content.name ? ' ' + content.name : '') + (content.memberID ? ' (' + content.memberID + ')' : '');
    var msg = '';
    if (content.name) msg += '会员: ' + content.name + '\n';
    if (content.mobile) msg += '手机: ' + content.mobile + '\n';
    if (content.memberID) msg += '会员号: ' + content.memberID + '\n';
    msg += '时间: ' + time + '\n';
    msg += '请长按通知点「拷贝」复制 Token\n';
    msg += token;

    $notification.post(title, subtitle, msg);
    console.log('[华住会] ' + flag + ': ' + token);
  }
} catch (e) {
  console.log('[华住会] 响应解析失败: ' + e);
}

// 原样透传响应
$done({body});
