/*************************************

项目名称：最红星期五 + 星巴克8.8券抢购加速（买单吧/交行信用卡）
使用声明：⚠️仅供参考，🈲转载与售卖！

原理说明（2026-09-11 HAR + 前端 chunk 逆向结论）：
买单吧抢券完整链路为：
  详情页点击购买
    → GET /catering/api/limit/buyProduct.json（限流闸门，参数 {}，仅 cache buster，返回 data:null）
    → 跳转 /catering/security/authorization/check.html（登录/安全校验，SPA push）
    → /catering/security/qualification/check.html（资格校验：未开始/售罄在这里被弹回详情页）
    → 通过后服务端 302 → /catering/security/user/order/confirm.html?productId=X&orderId=Y&panicBuyId=Z
       ↑↑↑ panicBuyId/orderId 在这一步由服务端生成并塞进 302 URL，前端无法凭空造

所以 2026-09-11 第一版的"302 直达 confirm.html"规则**已废弃**——
confirm.html 的 confirm.json 接口强校验 panicBuyId/orderId，缺失即返回"人太多了"。

⚠️ 该活动的服务端"未开始(24)/已售罄(08)"拦截发生在 qualification/check.html，
无法靠前端绕过。**加速只能从详情页侧入手**——
本脚本的响应改写（一）就是把详情页的 buttonType/sellState 提前激活，
让按钮 12:00 整点变成可点状态，省掉用户等按钮激活的几百毫秒反应时间。

*************************************

【一、响应改写：提前激活购买按钮（详情页加速）】

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday.js

【二、MITM】

[mitm]
hostname = creditcardapp.bankcomm.com

使用姿势（每天 12:00 开售前）：
1. 11:55 左右在买单吧打开目标券详情页（星巴克/中石化/加油券等均可）
2. 按钮已被本脚本提前激活（视觉上看不出，详情页倒计时按原样显示）
3. 12:00:00 整点立刻点"立即购买"，走 buyProduct → check 链 → confirm → 支付
4. 后续业务逻辑（资格校验、库存）由服务端把关，本脚本不绕过也不应绕过

回滚：删掉整段 [rewrite_local] 即恢复原行为。

*************************************/


var body = $response.body;

body = body.replace(/\"reddestActCount":\d+/g, '\"reddestActCount":1');

body = body.replace(/\"buttonType":"\d+"/g, '\"buttonType":"01"');

body = body.replace(/\"productActStatus":"\d+"/g, '\"productActStatus":""');

body = body.replace(/value="\d+"/g, 'value="01"');

body = body.replace(/currentTm = (""|"\d:\d{1,2}:\d{1,2}")/g, 'currentTm = "11:00:00"');

body = body.replace(/\"currentTm":"\d{1,2}:\d{2}:\d{2}"/g, '\"currentTm":"11:00:00"');

$done({body});
