/*************************************

TEST BUILD - 端到端验证专用，测完立即恢复正式版

项目名称: 华住会 Token (TEST)
说明: 任意 businessCode == 1000 的响应都弹通知，
      用于验证「规则匹配→脚本执行→通知横幅」链路。
      验证完成后会恢复为正式版 huazhu.js。

[rewrite_local]
^https:\/\/hweb-personalcenter\.huazhu\.com\/login\/login url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/huazhu.js
[mitm]
hostname = hweb-personalcenter.huazhu.com

*************************************/

var body = $response.body;
console.log('[华住会TEST] 脚本已执行，body长度=' + (body ? body.length : 0));

try {
  var obj = JSON.parse(body);
  var content = obj.content || {};
  var token = content.ssoToken || content.refreshToken || content.token || '';
  var bc = String(obj.businessCode || '');
  console.log('[华住会TEST] businessCode=' + bc +
              ' | token长度=' + token.length +
              ' | needGeeTest=' + (obj.needGeeTest || false) +
              ' | subEchoToken=' + (obj.subEchoToken || ''));

  var title = '华住会 TEST 链路OK';
  var subtitle = 'businessCode=' + bc;
  var msg = '脚本已执行并处理该响应。\n';
  if (token) {
    msg += '本响应含 token(长度' + token.length + ')，正式版会弹此 token\n';
  } else {
    msg += '本响应无 token (风控/错误响应)，正式版会静默跳过\n';
  }
  msg += '看到此通知 = 整条链路正常 ✅';
  $notification.post(title, subtitle, msg);
  console.log('[华住会TEST] 通知已发送');
} catch (e) {
  console.log('[华住会TEST] 解析异常: ' + e);
  $notification.post('华住会 TEST 脚本异常', '', String(e));
}

// 原样透传响应
$done({body});
