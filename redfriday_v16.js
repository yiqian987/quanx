/*************************************

项目名称：最红星期五 抢购详情页改写 v16（独立文件 / 替换 redfriday_bak.js 引用）
使用声明：⚠️仅供参考，🈲转载与售卖！

用法：在 QuanX 的 rewrite 远程引用里删掉旧的 redfriday_bak.js，加上本文件：
      https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday_v16.js
      旧的 redfriday.js 与 redfriday_bak.js 均保持原样，方便随时回滚。
      （本版与 bak 的关系：规则段一字不改，只改脚本内部 —— 见下）

【为什么要有这个文件】

2026-09-16 12:00 抢购成功那次，iPad 上用的是 redfriday_bak.js。把那份 HAR 的
56 条请求全部重放一遍得出的实测数据：

  bak 的规则是整域名兜底
      ^https?:\/\/creditcardapp\.bankcomm\.com
  ⇒ 本轮实际有 44 条请求被拉进 MITM 改写通道
  ⇒ 其中真正改写了内容的           0 条

  逐字段查全部响应体：
    reddestActCount   0 处                       从未出现 -> 空转
    currentTm        0 处                       从未出现 -> 空转
    buttonType       1 处 product/detail.json   值已是 "01" -> 空转
    productActStatus 2 处 store/detail.json、
                           recommend.json       值已是 ""  -> 空转
    value="\d+"      命中的是**支付确认页**
                     /orcpayment/html/payment-confirm.html

最后一条是真隐患，也是本文件存在的唯一理由：
    value="\d+" 是无差别全局正则，在整域名兜底之下，它的作用域覆盖
    **所有被拉进 MITM 的页面 HTML，包括支付确认页**。那次侥幸躲过，
    是因为页面上恰好是 value="on"（非数字）。只要支付页出现任意一个
    整数 input，就会被改成 value="01"。实测对照：
        原文   <input id="amt" value="88" /><input id="cnt" value="1" />
        旧脚本 <input id="amt" value="01" /><input id="cnt" value="01" />
        v16    <input id="amt" value="88" /><input id="cnt" value="1" />

本文件的改动只有一处：**在脚本内部加 URL 守卫**（script-response-body 里能
拿到 $request.url）。命中目标的 URL 才允许改写，其余一律原样放行。
所以它不是"新规则"，而是给旧规则加了一道保险。

【关于"详情页能提前点亮购买按钮"这件事】

bak 真正有机会施加影响的字段只有一个：buttonType（位于 product/detail.json，
那是 JSON，不会被 bankcomm_locating 的 HTML 规则抢走）。
2026-09-16 这次抓到的采样点上，服务端自己返回的就是 "01"，所以那次改写
是空转；但这**不能否认**它在更早时刻（比如 11:30）返回 "00" 时把按钮点亮。
本文件完整保留了这个能力 —— 实测服务端返回 "00" 时仍会被改成 "01"。
想验证 bak 到底有没有这份功劳：明天 11:30 打开详情页抓 30 秒 HAR，
看 product/detail.json 里的 buttonType 是 "00" 还是 "01"。

【行为对照（本次 HAR 全 56 条重放）】

    旧脚本 vs v16 的输出差异           0 条
    v16 允许改写的请求                 0 条
⇒ 换引用之后，本次抓到的这条链路上行为零变化；差别只在"将来支付页再出现
  整数 input 时不会被篡改"。

【可选：想少拉点请求进 MITM】

若想进一步降负载，可以把下面这条规则换成按接口收窄的版本（脚本守卫已经
保证不会改坏，只是少看几眼）。收敛到三个目标接口 —— product/detail.json、
marketing/list.json、product/detail.html —— 就够覆盖这五个目标字段。
注意 productActStatus 实测出现在 store/detail.json 与 recommend.json 里，
如果你依赖那两个字段，别把它们漏掉。

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday_v16.js

[mitm]
hostname = creditcardapp.bankcomm.com

回滚：删掉本文件的远程引用，把 redfriday_bak.js 加回去即可，两侧文件都在。

*************************************/


// 加固沿革：
//  - 09-14 加 IIFE + try/catch：原版是裸写 body.replace，$response.body 一旦为
//    null/undefined（QX 没解出 body、或 204/304 无内容），replace 直接抛
//    TypeError，脚本异常退出 => $done 永不调用 => QX 挂住请求直到 App 超时，
//    HAR 里表现为 status 0 / 响应头为空 / timings 全 -1。现在最坏也只是原样
//    放行，绝不挂请求。
//  - 09-16 加 URL 守卫：见头部说明。
(function () {
  var body = ($response && $response.body) || '';
  var url = String(($request && $request.url) || '');
  var out = body;

  // 只允许这三个目标被改写；其余（支付页、下单页、所有 confirm/paypwd
  // 接口…）一律原样放行。
  var isDetailJson = /\/catering\/api\/(?:product\/detail|marketing\/list)\.json/.test(url);
  var isDetailHtml = /\/catering\/product\/detail\.html/.test(url);

  try {
    if (isDetailJson) {
      out = out.replace(/\"reddestActCount":\d+/g, '\"reddestActCount":1');
      out = out.replace(/\"buttonType":"\d+"/g, '\"buttonType":"01"');
      out = out.replace(/\"productActStatus":"\d+"/g, '\"productActStatus":""');
    } else if (isDetailHtml) {
      // value / currentTm 只针对商品详情页 HTML。这两条是无差别正则，
      // 绝不能落到支付确认页上去 —— 那上面任何一个整数 input 都会被改。
      out = out.replace(/value="\d+"/g, 'value="01"');
      out = out.replace(/currentTm = (""|"\d:\d{1,2}:\d{1,2}")/g, 'currentTm = "11:00:00"');
      out = out.replace(/\"currentTm":"\d{1,2}:\d{2}:\d{2}"/g, '\"currentTm":"11:00:00"');
    }
  } catch (e) {
    out = body;
  }

  $done({ body: out });
})();
