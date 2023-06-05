#!name=SSA丝社

#!desc=SSA丝社解锁会员

#!icon=https://raw.githubusercontent.com/deezertidal/private/main/icons/ssa.png

#!homepage=https://github.com/deezertidal

#!author=lutqhysky




[rewrite_local]
^https?:\/\/www\.ssalegs\.store\/cms\/Appapi\/username\/username\/\d+ url script-response-body  https://raw.githubusercontent.com/yiqian987/quanx/main/ssa.js script-update-interval=0

[mitm]
hostname = www.ssalegs.store


var body = $response.body.replace(/groupid":\d+/g, 'groupid":4').replace(/jomkenylv":"\d+"/g, 'jomkenylv":"5"').replace(/overduedate":\d+/g, 'overduedate": 4100726753').replace(/overduedate2":\d+/g, 'overduedate2": 4100726753').replace(/groupname":".*?"/g, 'groupname":"官方认证"').replace(/username":".*?"/g, 'username":"清清情"');
$done({body});
