/*************************************

项目名称：太平洋保险
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?:\/\/cxbjwxsj\.cpic\.com\.cn/moto-api/motorcycle/reservation/bookingTime\(queryReservationInfo|queryReservationDateInfo) url script-echo-response https://raw.githubusercontent.com/yiqian987/quanx/main/cpic.js

[mitm]
hostname = cxbjwxsj.cpic.com.cn

*************************************/

var body = $response.body;

body = body.replace(/\"status":"\d+",/g, '\"status": "1",');

body = body.replace(/"surplusFlag"\s*:\s*(?:"N"|null)/g, '\"surplusFlag": "Y"');

$done({body});
