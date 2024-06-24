/*************************************

项目名称：平安好车主
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?://newretail\.pingan\.com\.cn/ydt/booking/stor/infos\?.+ url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/pahcz_book_info.js

[mitm]
hostname = newretail.pingan.com.cn

*************************************/


var body = $response.body;

body = body.replace(/\"storefrontname":"\平安产险北京分公司世纪财富中心门店",/g, '\"storefrontname": "我就看看匹配到哦啊了么平安产险北京分公司世纪财富中心门店",');
$done({body});
