/*************************************

项目名称：e生活8.8
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?:\/\/market-web\.ofpay\.com url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/elife8.8.js

[mitm]
hostname = market-web.ofpay.com

*************************************/


var body = $response.body;

body = body.replace(/\"remainStock":\d+/g, '\"remainStock":100');

body = body.replace(/\"rechargeType":"\d+"/g, '\"rechargeType":"01"');

body = body.replace(/\"productActStatus":"\d+"/g, '\"productActStatus":""');

body = body.replace(/\"limitCode":"2_UN_START"/g, '\"limitCode":"START"');

$done({body});
