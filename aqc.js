/*************************************
#!name=爱企查

#!desc=爱企查vip

#!homepage=https://github.com/deezertidal

#!author=

#!icon=https://raw.githubusercontent.com/deezertidal/private/main/icons/aqc.png
**************************************

[rewrite_local]
^https?://aiqicha\.baidu\.com/usercenter/getvipinfoajax url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/aqc.js
[mitm]
hostname = aiqicha.baidu.com
*************************************/
var body = $response.body
    .replace(/\"svip\":\{\"status\":0,\"startTime\":\"\",\"endTime\":\"\"/, "\"svip\":\{\"status\":1,\"startTime\":\"\",\"endTime\":\"2099-12-31\"");
$done({ body });
