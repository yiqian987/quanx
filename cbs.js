/*************************************

项目名称: 长白山

**************************************

[rewrite_local]
^https?://yun\.aichangbaishan\.com/platform/api\?method=ih\.cticket\.info\.getRestTickets url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/cbs.js
[mitm]
hostname = aichangbaishan.com

*************************************/


var body = $response.body;

body = body.replace(/\"number": \d+,/g, '\"number": 100,');

$done({body});
