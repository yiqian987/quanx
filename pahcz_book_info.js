/*************************************

项目名称：平安好车主
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?://newretail.pingan.com.cn/ydt/booking/store/infos\?.* url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/pahcz_book_info.js
[mitm]
hostname = newretail.pingan.com.cn

*************************************/


var body = $response.body;

// 创建新对象
var newObject = {
            "workingDateType": "1",
            "bookable": true,
            "storefrontSource": null,
            "deptCode": "201",
            "scdDeptCode": "201",
            "storefrontseq": "39807",
            "storefrontname": "摩托车投保预约",
            "storefrontabbrname": "摩托车投保",
            "serviceinfo": "",
            "servicetime": "周一至周五营业时间:上午09:00-12:00， 下午 14:00-17:00。\n",
            "detailaddress": "北京市朝阳区世纪财富中心2号楼2层平安门店",
            "provincecode": "110000",
            "citycode": "110100",
            "countycode": "110105",
            "longitude": "116.456500",
            "latitude": "39.913700",
            "distance": "",
            "limitDistance": "1000",
            "iswifi": "0",
            "areacode": "0755",
            "telephone": "95511",
            "storefrontServiceTypeCode": "1",
            "storefrontServiceTypeDesc": "销服柜面",
            "storefrontTypeCode": "1",
            "storefrontTypeDesc": "出单门店",
            "weekendServeDay": "0",
            "weekendServeAm": "0:00-0:00",
            "weekendServePm": "0:00-0:00",
            "weekdayServeAm": "09:00-12:00",
            "weekdayServePm": "14:00-17:00",
            "businessTime": true,
            "offerNumTime": false,
            "businessTypes": [],
            "bookBusinessTypes": [],
            "imageList": [],
            "holidayRunning": null,
            "privateweekstart1": null,
            "privateweekend1": null,
            "opentimepriate10": null,
            "opentimepriate11": null,
            "privateweekstart2": null,
            "privateweekend2": null,
            "opentimepriate20": null,
            "opentimepriate21": null,
            "privateweekstart3": null,
            "privateweekend3": null,
            "opentimepriate30": null,
            "opentimepriate31": null,
            "holidaytype": null,
            "customerQueueDistance": "1000",
            "mgWaiterUmId": null,
            "counterManager": null,
            "mobilePhone": null
        };

body = body.data.unshift(newObject);
$done({body})
