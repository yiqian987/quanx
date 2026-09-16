/*************************************

项目名称：最红星期五 抢购字段改写 v18（纯 JSON 接口 / 与定位脚本零冲突）
使用声明：⚠️仅供参考，🈲转载与售卖！

用法：QuanX 的 rewrite 远程引用指向本文件即可：
      https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday.js

      自 2026-09-16 起，本文件是这个改写脚本的唯一主文件，后续所有更新都改这里。
      ⚠️ redfriday_bak.js 是用户自己的历史备份，本文件之外的任何改动都不允许，
         该文件保持只读、永不修改。
      临时分支 redfriday_v16.js / redfriday_v17.js 的内容已并入此处并从仓库删除。

**************************************

【为什么规则只收 JSON：与 bankcomm_locating.js 划清边界】

2026-09-16 用户实测反馈：redfriday_v16 与 bankcomm_locating 同时启用时页面
又加载不出来，只开 locating 就正常。根因是规则的**完全包含关系**：

  bankcomm_locating v15 只收 .html
      ^https?:\/\/creditcardapp\.bankcomm\.com\/(?:catering\/...|(?:ccmmfood|openapps)\/...)\.html
  redfriday_v16 / bak 收整个域名
      ^https?:\/\/creditcardapp\.bankcomm\.com

⇒ locating 命中的页面，v16 百分之百也命中。而 QX 的规则匹配是
**自上而下、只取第一条**：谁在远程引用列表里排前面，就独占全部这些请求。
一旦 v16 排到前面，locating 的定位注入就一次都不执行 —— HTML 原样返回、
没有城市参数、SPA 跳 citySelector，页面白板。

用 2026-09-16 12:00 那份全链路 HAR（56 条）量化重叠面：

    locating 命中 且 v16 兜底也命中（互相抢）      4 条
      /catering/store/detail.html            x2
      /catering/product/detail.html          x2   <- 商品详情页，正是要救的页面
    只被 v16 吃到、locating 不要的 html         12 条（下单支付链，纯陪跑）
    被 v16 拉进 MITM 的 json                   35 条（含付款、下单接口）

这 4 条重叠 == iPad 上那几个页面能不能打开的全部赌注，而赌的是什么？赌的是
两个远程引用在列表里的先后顺序 —— 用户删一次引用重导一次，顺序就可能变。
这种耦合必须连根拔掉，而不是去记"应该把谁排前面"。

解法：**两边各占一条互不相交的地盘**（v17 引入，v18 沿用）
    bankcomm_locating  ->  只收 .html   （页面导航）
    redfriday_v17      ->  只收 .json   （接口数据）
没有任何一个 URL 能同时匹配两边，于是顺序再也不影响结果。
顺带把 MITM 面从 51 条压到 4 条以内 —— 支付链不再被拉进改写通道。

**************************************

【规则收窄到哪几个接口（按 2026-09-16 HAR 实证，不靠记忆）】

    /catering/api/product/detail.json    buttonType
    /catering/api/marketing/list.json    reddestActCount
    /catering/api/store/detail.json      productActStatus  <- 实测在这，不在 list.json
    /catering/api/recommend.json         productActStatus

实测数据（同一份 HAR）：
    reddestActCount   0 处        从未出现
    currentTm        0 处        从未出现
    buttonType       1 处        product/detail.json，值为 "01"
    productActStatus 2 处        store/detail.json + recommend.json，值为 ""

注意 09-14 那版注释写的是 "productActStatus 在 marketing/list.json"，
那是凭印象写的，与实测不符 —— 本次按实测纠正，list.json 仍保留在规则里
（它在别的采样点上可能带这个字段），只是不再当成唯一来源。

**************************************

【放弃掉的两条 replace，以及为什么】

    value="\d+"    ->  value="01"
    currentTm      ->  "11:00:00"

这两条只可能出现在 `product/detail.html`（那是 HTML 页），而 detail.html
已经归 bankcomm_locating 管 —— QX 只取第一条，排在后面的脚本永远轮不到，
从 09-14 到现在一直是空转。
更要命的是 value="\d+" 是无差别全局正则：只要落在任何含整数 input 的页面上
（典型就是支付确认页），金额会被改成 01。留在规则里等于留一颗雷。
既然它本来就执行不到，删掉是净收益。

**************************************

【"详情页能提前点亮购买按钮"保住了吗？保住了】

你反馈的"提前点进购买页"能力来自 product/detail.json 里的 buttonType，
那是 JSON，从头到尾都不在 locating 的地盘里。v17 完整保留这条改写：

    服务端返回 "00"  ->  v17 改成 "01"  （按钮点亮，能力原样保留）
    服务端返回 "01"  ->  不改写

2026-09-16 那次采样点上服务端自己就返回 "01"，所以那一次是空转，但这不否定
它在更早时刻（比如 11:30）的用处。本文件对这两种情况的处理与 bak 完全一致：
拿那份 HAR 全 56 条逐条重放，bak 与 v17 的输出差异 0 条。

想验证 bak 到底有没有这份功劳：11:30 打开详情页抓 30 秒 HAR，看
product/detail.json 里的 buttonType 是 "00" 还是 "01"。

**************************************

[rewrite_local]
^https?:\/\/creditcardapp\.bankcomm\.com\/catering\/api\/(?:product\/detail|marketing\/list|store\/detail|recommend)\.json url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/redfriday.js

[mitm]
hostname = creditcardapp.bankcomm.com

这条规则的两个细节:
  - 结尾锚到 .json，且限定 /catering/api/ 前缀 —— 支付页、下单页、
    所有 .html 一律进不来，与 bankcomm_locating 无交集
  - 脚本内部另有一道 URL 守卫（同 v16），即便将来有人把规则放宽，
    改写范围也不会失控。两层防护，互相兜底

回滚：删掉本文件的远程引用即可；redfriday_bak.js 仍在仓库里，随时可换回去。
若要恢复更早的"整域名兜底"写法（不推荐，见上），把上面那条正则换回
^https?:\/\/creditcardapp\.bankcomm\.com 即可。

*************************************/


// 加固沿革：
//  - 09-14 加 IIFE + try/catch：原版裸写 body.replace，$response.body 一旦为
//    null/undefined（QX 没解出 body、或 204/304 无内容），replace 直接抛
//    TypeError => $done 永不调用 => QX 挂住请求直到 App 超时，
//    HAR 里表现为 status 0 / 响应头为空 / timings 全 -1。
//  - 09-16 v16 加 URL 守卫（限制改写范围），v17 保留。
//  - 09-16 v17 规则收窄到纯 JSON：与 bankcomm_locating 的 .html 地盘零交集，
//    彻底摆脱"两个远程引用谁排前面"的隐性依赖。
//  - 09-16 v18 收口：v16/v17 并入本文件，仓库里只留 redfriday.js 与
//    redfriday_bak.js 两个文件，消灭"到底引用的是哪个"的混乱。
(function () {
  var body = ($response && $response.body) || '';
  var url = String(($request && $request.url) || '');
  var out = body;

  // 白名单外的 URL 一律原样放行（第二道守卫，配合规则层的收窄）
  var allowed = /\/catering\/api\/(?:product\/detail|marketing\/list|store\/detail|recommend)\.json/.test(url);

  try {
    if (allowed) {
      out = out.replace(/\"reddestActCount":\d+/g, '\"reddestActCount":1');
      out = out.replace(/\"buttonType":"\d+"/g, '\"buttonType":"01"');
      out = out.replace(/\"productActStatus":"\d+"/g, '\"productActStatus":""');
    }
  } catch (e) {
    out = body;
  }

  $done({ body: out });
})();
