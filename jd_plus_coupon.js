/*************************************

项目名称: jd_plus_coupon

**************************************

[rewrite_local]
^https?:\/\/api\.m\.jd\.com\/(?:client\.action|api\?functionId=(coupon_dayCouponList_v2.*|bff_rights_points&scene=serviceDetail)) url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/jd_plus_coupon.js

[mitm]
hostname = api.m.jd.com

*************************************/


var body = $response.body;


body = body.replace(/\"couponState":\d+/g, '\"couponState":1');

body = body.replace(/\"intervalUsedCount":\d+/g, '\"intervalUsedCount":1');

body = body.replace(/\"exchangeStatus":\d+/g, '\"exchangeStatus":1');

body = body.replace(/\"hasStock":false/g, '\"hasStock":true');

body = body.replace(/\"skuStatus":5/g, '\"skuStatus":0');

$done({body});
