/*************************************

项目名称：平安好车主
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?:\/\/newretail\.pingan\.com\.cn url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/pahcz.js

[mitm]
hostname = newretail.pingan.com.cn

*************************************/


var body = $response.body;

body = body.replace(/\"bookableNum":\d+/g, '\"bookableNum":100');

body = body.replace(/\"totalBookableNum":\d+/g, '\"totalBookableNum":100');

body = body.replace(/\"totalBooked":\d+/g, '\"totalBooked":0');

$done({body})
