/*************************************

项目名称: 华住会 Token

说明: 拦截华住会登录接口响应，解析 content.ssoToken，
      写入 Quantumult X 本地存储($prefs) 并打印简短日志。
      ⚠ Quantumult X 的 rewrite(script-response-body) 脚本环境
      不提供 $notification(实测 iOS/iPadOS/Mac 均为 undefined)，
      无法在此直接弹横幅；请搭配任务脚本 huazhu_notify.js
      ([task_local] 每分钟轮询) 来弹出通知。
      响应内容原样透传，不做任何修改。

用法: 将下方 [rewrite_local] 规则与 [mitm] 主机名粘贴进配置文件，
      并另配 [task_local] 行引用 huazhu_notify.js(见其文件头)。

**************************************

[rewrite_local]
^https:\/\/hweb-personalcenter\.huazhu\.com\/login\/login url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/huazhu.js
[mitm]
hostname = *.huazhu.com

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

    // 持久化 Token 与账号信息，供通知脚本 / 复显脚本读取
    $prefs.setValueForKey(token, STORE_KEY);
    $prefs.setValueForKey(JSON.stringify({
      name: content.name || '',
      memberID: content.memberID || content.memberId || '',
      mobile: content.mobile || ''
    }), META_KEY);

    var flag = (oldToken && oldToken !== token) ? 'Token已更新' : (oldToken ? '重新登录' : '首次捕获');
    console.log('[华住会] ' + flag + ': ' + token);
  }
} catch (e) {
  console.log('[华住会] 响应解析失败: ' + e);
}

// 原样透传响应
$done({body});
