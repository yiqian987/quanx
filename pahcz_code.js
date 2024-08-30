function getCk() {
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
