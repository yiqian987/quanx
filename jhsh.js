/*************************************

项目名称: 建行生活

**************************************

[rewrite_local]
^https?://yunbusiness\.ccb\.com/(clp_service|clp_coupon)/txCtrl\?.* url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/jhsh.js
[mitm]
hostname = yunbusiness.ccb.com

*************************************/


var body = $response.body;


body = body.replace(/\"SYSTEM_TIME":"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/, '\"SYSTEM_TIME": "2023-06-08 18:59:59"');

$done({body});
