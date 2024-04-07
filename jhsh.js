/*************************************

项目名称: 建行生活

**************************************

[rewrite_local]
^https?://yunbusiness\.ccb\.com/(clp_service|clp_coupon)/txCtrl\?.* url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/jhsh.js
[mitm]
hostname = yunbusiness.ccb.com

*************************************/


var body = $response.body;


body = body.replace(/\"SYSTEM_TIME":"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/, '\"SYSTEM_TIME": "2024-04-07 18:59:59"');

body = body.replace(/\"HdFrSl_Lock_Num":"\d+",/, '\"HdFrSl_Lock_Num": "0",');

body = body.replace(/\"SOLD_OUT_DATE":"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}",/, '\"SOLD_OUT_DATE": "0",');

//body = body.replace(/\"Alrdy_Sell_Ivnt_Num":"\d+",/, '\"Alrdy_Sell_Ivnt_Num": "1",');

body = body.replace(/\"AVALIABLE_STOCK":"\d+",/, '\"AVALIABLE_STOCK":"50",');

body = body.replace(/\"SURPLUS_STOCK":"\d+",/g, '\"SURPLUS_STOCK": "30",');

body = body.replace(/\"EFFECT_PERIOD_END":"\d+",/g, '\"EFFECT_PERIOD_END": "20990630235959",');

body = body.replace(/\"Cur_Vld_Ind":"\d+",/, '\"Cur_Vld_Ind": "1",');

body = body.replace(/\"Remain_Num":"\d+",/, '\"Remain_Num": "1",');

body = body.replace(/\"SpBkAtAyTm_Ind":"\d+",/, '\"SpBkAtAyTm_Ind": "0",');

body = body.replace(/\"USER_GET_NUM":"\d+",/, '\"USER_GET_NUM": "0",');

$done({body});
