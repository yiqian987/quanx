if ($request && $request.method != 'OPTIONS') {
    const obj = ObjectKeys2LowerCase($request.headers);
    const objj = $request.headers;
    const deviceid = obj.deviceid;
    const did = obj.did;
    const token = obj.authorization.replace(/^Bearer\s*/, '');
    const ckVal = $.toStr({deviceid, did, token});
    $.setdata(ckVal, _key)
    $.msg($.name, '', '获取签到数据成功🎉\n' + objj)
}
$.done();
//通知
async function sendMsg(message){if(!message)return;try{if($.isNode()){try{var notify=require('./sendNotify');}catch(e){var notify=require('./utils/sendNotify');}await notify.sendNotify($.name,message);}else{$.msg($.name,'',message);}}catch(e){$.log(`\n\n-----${$.name}-----\n${message}`);}};
