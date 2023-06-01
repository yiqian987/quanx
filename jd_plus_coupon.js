/*************************************

项目名称: jd_plus_coupon

**************************************

[rewrite_local]
^https?://api\.m\.jd\.com/api\?functionId=coupon_dayCouponList_v2.* url script-response-body https://alist.cateyestar.com:2443/d/smb_backup/jdplusquan.js?sign=hUBk65Rtx2MM0RDRqsDOVFwj-5EEFWsxPJ1A2rj2lbE=:0
[mitm]
hostname = api.m.jd.com

*************************************/


var body = $response.body;


body = body.replace(/\"couponState"::\d+/g, '\"couponState":1');

body = body.replace(/\"intervalUsedCount":\d+/g, '\"intervalUsedCount":1');

$done({body});
