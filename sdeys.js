/*************************************

项目名称：儿研所挂号
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?:\/\/yyxt\.shouer\.com\.cn url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/sdeys.js

[mitm]
hostname = yyxt.shouer.com.cn

*************************************/


var body = $response.body;

body = body.replace(/\"Remain":"\d+"/g, '\"Remain":"100"');

body = body.replace(/\"can_tag":\d+/g, '\"can_tag":1');

body = body.replace(/\"fulled_tag":\d+/g, '\"fulled_tag":0');

$done({body});
