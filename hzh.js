/**
 * 华住会 Huazhu Token 捕获脚本 (Quantumult X)
 * ---------------------------------------------------------------
 * 功能：拦截华住会 App 登录接口响应，解析 ssoToken，持久化存储，
 *       并在通知栏弹出提示，方便一键复制 Token。
 *
 * 使用前提（Quantumult X 配置 [rewrite_local] 中启用）：
 *   ^https:\/\/hweb-personalcenter\.huazhu\.com\/login\/login url script-response-body huazhu_token.js
 *
 * 脚本放置路径：Quantumult X 的 Scripts 目录（如 iCloud 云盘
 *   Quantumult X/Scripts/huazhu_token.js，或本地 Quantumult X/Scripts 下）
 *
 * 触发方式：在 iPhone 上打开华住会 App，完成一次登录
 *   （账号密码 或 短信验证码），本脚本自动抓取 token 并推送通知。
 *
 * 说明：
 *   - 登录成功标志：响应 businessCode == "1000"，token 在 content.ssoToken
 *     （同一响应里 content.refreshToken 与之同值）
 *   - 登录后业务请求在请求头 token / user-token / usertoken 三个字段携带该值
 *   - 通知正文最后一行即为 token：在通知中心长按通知 → 点击「拷贝」即可复制
 * ---------------------------------------------------------------
 */

const STORE_KEY = 'huazhu_sso_token';   // token 持久化 key
const META_KEY = 'huazhu_token_meta';   // 会员信息(展示用) key

function main() {
  // 兼容非 response-body 上下文调用
  if (typeof $response === 'undefined' || !$response.body) {
    $done({});
    return;
  }

  const url = $request.url || '';
  // 只处理登录接口，其它请求原样放行
  if (!/\/login\/login/i.test(url)) {
    $done({ body: $response.body });
    return;
  }

  const body = $response.body;
  try {
    const obj = JSON.parse(body);
    const bizCode = String(obj.businessCode || '');
    const c = obj.content || {};

    // 兼容可能的字段差异，按优先级取 token
    const token = c.ssoToken || c.refreshToken || c.token || c.accessToken || '';

    if (bizCode === '1000' && token) {
      const oldToken = $prefs.valueForKey(STORE_KEY) || '';
      const memberId = c.memberID || c.memberId || '';
      const name = c.name || '';
      const mobile = c.mobile || '';
      const now = new Date();

      // 持久化 token 与会员元信息
      $prefs.setValueForKey(token, STORE_KEY);
      $prefs.setValueForKey(JSON.stringify({
        memberId: memberId,
        name: name,
        mobile: mobile,
        time: now.toLocaleString()
      }), META_KEY);

      // 提示文案按「是否首次/更新」区分
      let flag = '【首次捕获】';
      if (oldToken && oldToken !== token) flag = '【Token 已更新】';
      else if (oldToken) flag = '【重新登录】';

      console.log('[华住会] ' + flag + ' ssoToken=' + token);

      // 组装通知：关键 token 放正文最后一行，便于通知中心长按「拷贝」
      let subTitle = '';
      if (name) subTitle += name;
      if (memberId) subTitle += (subTitle ? ' ' : '') + '(' + memberId + ')';
      subTitle = subTitle || '华住会账号';

      let msg = '账号: ' + (name || mobile || '-');
      if (mobile) msg += '\n手机: ' + mobile;
      if (memberId) msg += '\n会员号: ' + memberId;
      msg += '\n时间: ' + now.toLocaleString();
      msg += '\n请长按通知点「拷贝」复制 Token\n';
      msg += token;

      $notification.post('华住会 Token' + (flag === '【重新登录】' ? '(重新登录)' : flag), subTitle, msg);
    }
    // 非成功/无 token 的响应不做处理，直接透传
  } catch (e) {
    console.log('[华住会] 响应解析失败: ' + (e && e.message ? e.message : e));
  }

  // 响应原样透传，不做任何修改（仅借道读取 token）
  $done({ body: body });
}

main();
