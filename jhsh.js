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

body = body.replace(/\"HdFrSl_Lock_Num":"[0-9]*,"/, '\"HdFrSl_Lock_Num": "50",');

body = body.replace(/\"SOLD_OUT_DATE":"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}",/, '\"SOLD_OUT_DATE": "0",');

body = body.replace(/\"Alrdy_Sell_Ivnt_Num":"[0-9]*,"/, '\"Alrdy_Sell_Ivnt_Num": "1",');

body = body.replace(/\"SURPLUS_STOCK":"[0-9]*",/, '\"SURPLUS_STOCK": "30",');

$done({body});
