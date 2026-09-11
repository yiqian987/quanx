/*************************************

项目名称：最红星期五 + 星巴克8.8券抢购加速（买单吧/交行信用卡）
使用声明：⚠️仅供参考，🈲转载与售卖！

原理说明（2026-09-11 HAR 逆向结论）：
买单吧抢券完整链路为：
  详情页点击购买
    → GET /catering/api/limit/buyProduct.json（限流闸门，通过率高）
    → 跳转 /catering/security/authorization/check.html（登录/安全校验，服务端302）
    → /catering/security/qualification/check.html（资格校验：未开始/售罄在这里被弹回详情页）
    → 通过后 302 → /catering/security/user/order/confirm.html（下单确认页，真正的下单/支付入口）
"活动未开始(24)/已售罄(08)" 的拦截发生在服务端 qualification/check.html，
所以正常流程下 12:00 前根本进不了下单页。
本方案：QuanX 302 规则拦截 qualification/check.html，直接改道下单确认页，
提前坐在下单页，12:00:00 整点点支付，省掉两跳校验 + 下单页加载（约2-3秒）。

*************************************

【一、响应改写：提前激活购买按钮（原有功能）】

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday.js

【二、302 直达下单页：跳过资格校验链（星巴克30元券 productId=11294182）】

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/security\/qualification\/check\.html url 302 https://creditcardapp.bankcomm.com/catering/security/user/order/confirm.html?productId=11294182&buyCount=1

【三、MITM】

[mitm]
hostname = creditcardapp.bankcomm.com

使用姿势（每天 12:00 开售前）：
1. 11:55 左右在买单吧打开星巴克30元代金券详情页（productId=11294182）
2. 点"立即购买"——因 302 规则改道，会直接落在下单确认页（不再被"未开始"弹回）
3. 停在下单页等倒计时，12:00:00 整点立刻点支付
4. 若换商品：把规则二中的 productId 换成目标商品ID（详情页 URL 里有）

回滚：删掉规则二即恢复原行为。

*************************************/


var body = $response.body;

body = body.replace(/\"reddestActCount":\d+/g, '\"reddestActCount":1');

body = body.replace(/\"buttonType":"\d+"/g, '\"buttonType":"01"');

body = body.replace(/\"productActStatus":"\d+"/g, '\"productActStatus":""');

body = body.replace(/value="\d+"/g, 'value="01"');

body = body.replace(/currentTm = (""|"\d:\d{1,2}:\d{1,2}")/g, 'currentTm = "11:00:00"');

body = body.replace(/\"currentTm":"\d{1,2}:\d{2}:\d{2}"/g, '\"currentTm":"11:00:00"');

$done({body});
