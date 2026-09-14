/*************************************

项目名称：最红星期五 + 星巴克8.8券抢购加速（买单吧/交行信用卡）
使用声明：⚠️仅供参考，🈲转载与售卖！

原理说明（2026-09-11/09-13 两轮 HAR 逆向结论）：
买单吧抢券完整链路为：
  详情页点击购买
    → GET /catering/api/limit/buyProduct.json（限流闸门，售罄状态实测仍 200 放行）
    → /catering/security/authorization/check.html（302）
    → /catering/security/qualification/check.html（资格校验 + 服务端时间闸门）
    → 通过后 302 → /orcorder/order/orclogin.html（CAS SSO 双跳建会话）
    → 落 /catering/security/user/order/confirm.html（页面自动 GET confirm.json 现场生成 orderId）
    → 用户点"提交订单" → POST /orcorder/FA/confirm.json（无签名/一次性token）

09-13 实抢复盘：资格校验 12:00:00.7 即通过，输在 SSO 双跳+页面加载的 ~4.7s，
最终 12:00:05.3 提交已售罄。故本版新增 302 规则：提前进 orclogin 链，
12:00 整点只打最终 POST。

⚠️ 安全边界：confirm 页自动加载 ≠ 自动下单，真实成交只发生在用户点"提交订单"。

*************************************

【一、重定向规则：绕过资格校验时间闸门，提前进下单链】

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/.+\/qualification\/check\.html\?.*productId=(\d+).*city_code=(\d+).*buyCount=(\d+) url 302 https://creditcardapp.bankcomm.com/orcorder/order/orclogin.html?callbackurl=catering%2Fsecurity%2Fuser%2Forder%2Fconfirm.html&productId=$1&city_code=$2&buyCount=$3

【二、响应改写：提前激活购买按钮（详情页加速）】

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/api\/product\/detail\.json url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday.js
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/api\/marketing\/list\.json url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday.js

（2026-09-14 二次收窄说明）本条经历两次收窄：整域名 -> /catering/api/ -> 两个具体接口。
踩过的坑依次是：
  ① 整域名兜底会把 locating.html 一起吃掉 —— QX 重写「先本地后远程、
     远程列表从上到下、只取第一条匹配」，排在前面的宽正则会让后面的规则永远不触发，
     bankcomm_locating.js 的定位修复就死在这上面。
  ② /catering/api/ 兜底表面上解决了 ①，但把 rpkt / dishes / reviews /
     recommend / search.config / user/location 全拉进了 script-response-body。
     2026-09-14 20:52 的 iPad HAR 里实测：该正则命中 16 条请求，真正需要改写的 0 条，
     而其中 7 条以 status 0（无响应头、timings 全 -1、连接被断）失败，
     连带 SPA 跳 citySelector -> loaderror 白板。
本脚本真正要改的字段只出现在这两个接口里：
  buttonType        -> /catering/api/product/detail.json
  reddestActCount   -> /catering/api/marketing/list.json
  productActStatus  -> /catering/api/marketing/list.json
  currentTm         -> 6 份 HAR（09-11~09-14）中从未出现
注意：value="NN" / currentTm 只出现在 product/detail.html（HTML）里，不在 JSON 接口里，
这两条 replace 一直是空转的；若要让它们生效，需再加一条针对
  ^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/product\/detail\.html
的同类规则（本次未加 —— 每多一条改写就多一分 status 0 断流风险，按需自行开启）。
⚠️ 上面这行故意不写成完整规则行：注释里若出现「url + 脚本类型 + 脚本地址」完整三段，
   资源解析器有可能把它误认成第三条规则，把 product/detail.html 也拉进改写。
回滚：把两行正则换回 ^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/api\/ 即可。

【三、MITM】

[mitm]
hostname = creditcardapp.bankcomm.com

使用姿势（每天 12:00 开售前）：
1. 11:55 左右在买单吧打开目标券详情页（星巴克/中石化/加油券等均可）
2. 按钮已被响应改写提前激活（视觉上看不出，详情页倒计时按原样显示）
3. 11:59:40~50 点"立即购买"——302 规则把资格校验直接带进 orclogin SSO 链，
   正常情况下应直接落到 confirm 下单页（orderId 已现场生成）
4. 12:00:00 整点精准点"提交订单"，只打最终 POST
5. 若 11:59:5x 点购买仍弹"活动未开始"（规则未拦到），立刻照常重试，
   12:00 整点正常流程保底
6. 后续业务逻辑（资格校验、库存）由服务端最终把关，本脚本不绕过也不应绕过

回滚：删掉【一】的 302 规则即恢复"仅提前点亮按钮"行为；删掉整段 [rewrite_local] 恢复原样。

*************************************/


// 2026-09-14 加固：原版是裸写 body.replace，$response.body 一旦为 null/undefined
// （例如 QX 没解出 body、或响应是无内容的 204/304），body.replace 直接抛 TypeError，
// 脚本异常退出 => $done 永远不会被调用 => QX 挂着这个请求直到 App 超时 abort，
// HAR 里就表现为 status 0 / 响应头为空 / timings 全 -1（2026-09-14 iPad HAR 实测）。
// 所以这里用 try/catch 兜死：$done 一定会被调用，最坏也只是原样放行，绝不挂请求。
(function () {
  var body = ($response && $response.body) || '';

  try {
    body = body.replace(/\"reddestActCount":\d+/g, '\"reddestActCount":1');
    body = body.replace(/\"buttonType":"\d+"/g, '\"buttonType":"01"');
    body = body.replace(/\"productActStatus":"\d+"/g, '\"productActStatus":""');
    body = body.replace(/value="\d+"/g, 'value="01"');
    body = body.replace(
      /currentTm = (""|"\d:\d{1,2}:\d{1,2}")/g,
      'currentTm = "11:00:00"'
    );
    body = body.replace(
      /\"currentTm":"\d{1,2}:\d{2}:\d{2}"/g,
      '\"currentTm":"11:00:00"'
    );
  } catch (e) {}

  $done({ body: body });
})();
