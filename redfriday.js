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
^https?:\/\/creditcardapp\.bankcomm\.com url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday.js

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


var body = $response.body;

body = body.replace(/\"reddestActCount":\d+/g, '\"reddestActCount":1');

body = body.replace(/\"buttonType":"\d+"/g, '\"buttonType":"01"');

body = body.replace(/\"productActStatus":"\d+"/g, '\"productActStatus":""');

body = body.replace(/value="\d+"/g, 'value="01"');

body = body.replace(/currentTm = (""|"\d:\d{1,2}:\d{1,2}")/g, 'currentTm = "11:00:00"');

body = body.replace(/\"currentTm":"\d{1,2}:\d{2}:\d{2}"/g, '\"currentTm":"11:00:00"');

$done({body});
