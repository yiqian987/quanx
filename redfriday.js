/*************************************

项目名称：最红星期五
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday.js

[mitm]
hostname = creditcardapp.bankcomm.com

*************************************/


var body = $response.body;

body = body.replace(/\"reddestActCount":\d+/g, '\"reddestActCount":1');

body = body.replace(/\"buttonType":"\d+"/g, '\"buttonType":"01"');

body = body.replace(/\"productActStatus":"\d+"/g, '\"productActStatus":""');

body = body.replace(/value="\d+"/g, 'value="01"');

body = body.replace(/currentTm = "(\"|\d:\d{1,2}:\d{2})|\""/g, 'currentTm = "11:00:00"');

body = body.replace(/\"currentTm":"\d{2}:\d{2}:\d{2}"/g, '\"currentTm":"11:00:00"');

$done({body});
