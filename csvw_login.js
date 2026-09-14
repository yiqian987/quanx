/**
 * 上汽大众 APP(csvw) —— 免抓包 ck 自取 + 签到/积分类青龙脚本
 * -----------------------------------------------------------
 * 与原版 wf021325/qx/task/csvw.js 的区别：
 *   原脚本：ck 必须靠旧版 APP(2.7.1) + MITM 抓取 at/actions/refresh 请求头获得
 *   本脚本：直接复现 APP 登录链路拿到 ck，ck 过期后自动重登，无需手机、无需抓包
 *
 * 运行：node csvw_login.js      (Node 18+ 零依赖，青龙/QX Task 均可跑)
 *
 * 环境变量：
 *   csvw_account = {"mobile":"13800000000","pwd":"xxxxxx"}   # 可选，用于 ck 过期后重登
 *   csvw_data    = {"deviceid":"...","did":"...","token":"..."}  # ck，脚本会自动写入/更新
 *
 * 策略：
 *   1. 有 ck 且距过期 > 2 天  -> 直接用 PUT at/actions/refresh 换 accessToken
 *   2. ck 缺失/过期/被踢      -> pwdlogin -> app/token 重新取 ck 并写回
 *   3. 之后：getSxToken -> 签到(mweb v3) -> 查积分 -> 查签到状态
 *
 * 注意：
 *   * refreshToken 有效期约 13 天，且不滚动续期 -> 每 ~10 天必须由 account 重登一次
 *   * deviceid / did 一旦固定不要随便换：换新的会被风控判为新设备, pwdlogin 直接返回
 *     510073「请您使用验证码登录」
 */

const KEY_CK = 'csvw_data';
const KEY_ACCOUNT = 'csvw_account';
const HOST = 'https://api.mos.csvw.com';
const MWEB = 'https://mweb.mos.csvw.com';
const UA_APP = 'MosProject_Live/7 CFNetwork/3860.700.1 Darwin/25.6.0';
const UA_WEB = 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E302SVW IOS';
const IOS_VER = '26.6.1';
const APP_VER = '2.7.0';

const isNode = typeof module !== 'undefined' && module.exports && typeof $httpClient === 'undefined';

/* ---------------- 存储 / 通知适配：Node | QX | 通用 ---------------- */
const store = {
    get(k) {
        if (isNode) {
            if (process.env[k]) return process.env[k];
            try { return require('fs').readFileSync(`./${k}.txt`, 'utf8').trim(); } catch (e) { return ''; }
        }
        return $prefs.valueForKey(k) || '';
    },
    set(k, v) {
        if (isNode) { try { require('fs').writeFileSync(`./${k}.txt`, v); } catch (e) { } return; }
        $prefs.setValueForKey(v, k);
    },
};
const notify = (t, c) => {
    if (isNode) console.log(`\n===== ${t} =====\n${c}\n`);
    else if (typeof $notify === 'function') $notify(t, '', c);
    else $msg && $msg(t, '', c);
};
const log = (...a) => isNode ? console.log(...a) : console.log(a.join(' '));

/* ---------------- HTTP：优先 $httpClient(QX)，否则 node fetch ---------------- */
async function http({ url, method = 'GET', headers = {}, body = '', raw = false }) {
    if (typeof $httpClient !== 'undefined') {
        return await new Promise(res => {
            $httpClient[method.toLowerCase()]({ url, headers, body }, (e, r, d) => res(e ? '' : d));
        });
    }
    const opt = { method, headers: { ...headers }, redirect: 'follow' };
    if (body) opt.body = body;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const r = await fetch(url, { ...opt, signal: controller.signal });
        const txt = await r.text();
        if (!txt) return '';
        return raw ? txt : txt;
    } catch (e) {
        if (isNode) log(`  [http error] ${e.message}`);
        return '';
    } finally { clearTimeout(timer); }
}
const J = async o => { const t = await http(o); try { return JSON.parse(t); } catch (e) { return { code: '-1', raw: t }; } };

/* ---------------- 工具 ---------------- */
const uuid32 = () => require0crypto().toUpperCase();
function require0crypto() {
    if (typeof require === 'function') return require('crypto').randomUUID().replace(/-/g, '');
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}
function jwtPayload(t) {
    try {
        const seg = String(t).split('.');
        let b = seg[1].replace(/-/g, '+').replace(/_/g, '/');
        b += '='.repeat((4 - b.length % 4) % 4);
        const s = typeof Buffer !== 'undefined'
            ? Buffer.from(b, 'base64').toString('utf8')
            : decodeURIComponent(escape(atob(b)));
        return JSON.parse(s);
    } catch (e) { return {}; }
}
const rtLeftDays = t => {
    const p = jwtPayload(t);
    return p.exp ? Math.floor((p.exp - Date.now() / 1000) / 86400) : -1;
};

/* ---------------- 主体 ---------------- */
class Csvw {
    constructor(deviceId, did) {
        this.deviceId = deviceId;
        this.did = did;
        this.cookies = '';
        this.userId = '';
        this.openId = '';
        this.accessToken = '';
        this.tokenType = 'Bearer';
        this.refreshToken = '';
        this.userToken = '';
        this.acw = '';
    }
    baseHeaders(auth = '') {
        const ts = Date.now().toString();
        const nonce = uuid32();
        const h = {
            'Accept': 'application/json',
            'Authorization': auth,
            'Timestamp': ts,
            'Nonce': nonce,
            'OS': 'iOS',
            'Accept-Language': 'zh',
            'Content-Type': 'application/json; charset=utf-8',
            'deviceId': this.deviceId,
            'Did': this.did,
            'TraceId': `${this.deviceId}_${this.userId || 'sc'}_${this.did}_${ts}`,
            'User-Agent': UA_APP,
        };
        if (this.cookies) h['Cookie'] = this.cookies;
        return h;
    }
    async call(method, path, { auth = '', body = '', extra = {}, base = HOST } = {}) {
        return await J({ url: base + path, method, headers: { ...this.baseHeaders(auth), ...extra }, body });
    }

    /* step1 密码登录 -> idToken */
    async pwdlogin(mobile, pwd) {
        const r = await this.call('POST', '/mos/security/api/v1/app/actions/pwdlogin', {
            body: JSON.stringify({
                picTicket: '', scope: 'openid', deviceType: 'ios', deviceId: this.did,
                mobile, brand: 'vw', pwd, picContent: ''
            })
        });
        if (r.code !== '000000') throw new Error(`pwdlogin 失败 ${r.code} ${r.description}`);
        this.idToken = r.data.idToken;
        this.userId = String(r.data.userId || '');
        return r.data;
    }
    /* step2 idToken -> accessToken / refreshToken */
    async appToken() {
        const r = await this.call('POST', '/mos/security/api/v1/app/token', {
            body: JSON.stringify({
                consentTypeList: 'app_privacy,app_agreement', idToken: this.idToken,
                scope: 'user', isNeedSign: true
            })
        });
        if (r.code !== '000000') throw new Error(`token 失败 ${r.code} ${r.description}`);
        this.accessToken = r.data.accessToken;
        this.refreshToken = r.data.refreshToken;
        this.tokenType = r.data.tokenType || 'Bearer';
        const p = jwtPayload(this.refreshToken);
        this.openId = p.ssoid || '';
        this.userId = String(p.sub || this.userId);
        return r.data;
    }
    /* step3 refreshToken -> accessToken（即 csvw.js 的第一步） */
    async refresh(rt) {
        this.refreshToken = rt || this.refreshToken;
        const r = await this.call('PUT', '/mos/security/api/v1/app/at/actions/refresh', {
            auth: `Bearer ${this.refreshToken}`,
            body: JSON.stringify({ refreshToken: this.refreshToken, scope: 'user' })
        });
        if (r.code === '000000') {
            this.accessToken = r.data.accessToken;
            this.tokenType = r.data.tokenType || 'Bearer';
            const p = jwtPayload(this.refreshToken);
            this.openId = p.ssoid || '';
            this.userId = String(p.sub || '');
            if (r.data.refreshToken) this.refreshToken = r.data.refreshToken;
        }
        return r;
    }
    async getSxToken() {
        const r = await this.call('GET', `/mos/operation/home/api/v2/users/${this.userId}/getSxToken?userId=${this.userId}`,
            { auth: `${this.tokenType} ${this.accessToken}` });
        this.userToken = r?.data?.userToken || '';
        return this.userToken;
    }
    /* 签到：mweb v3（阿里云 WAF，需 acw_sc__v2） */
    signHeaders() {
        return {
            'Authorization': `${this.tokenType} ${this.accessToken}`,
            'X-COP-accessToken': this.userToken,
            'Content-Type': 'application/json',
            'Did': this.did,
            'deviceId': this.deviceId,
            'User-Agent': UA_WEB,
        };
    }
    async sign() {
        const url = `${MWEB}/mos/operation/home/api/v3/user/sign/info`;
        const body = JSON.stringify({ brand: 'vw', idpId: this.openId, userId: this.userId });
        const doReq = async () => {
            const h = this.signHeaders();
            if (this.acw) h['Cookie'] = `acw_sc__v2=${this.acw}`;
            return await http({ url, method: 'POST', headers: h, body });
        };
        let txt = await doReq();
        if (txt && txt.includes('arg1')) {                       // 触发 WAF
            const m = txt.match(/arg1='([^']*)'/);
            if (m) {
                this.acw = getSignCookie(m[1]);
                log('  触发阿里云 WAF, 重算 acw_sc__v2 后重试');
                txt = await doReq();
            }
        }
        let obj = {}; try { obj = JSON.parse(txt); } catch (e) { }
        if (obj && typeof obj === 'object' && obj.code === '000000')
            return `签到成功: 已连续签到 ${obj?.data?.signCount} 天`;
        return `❌签到失败: ${obj?.description || txt.slice(0, 120)}`;
    }
    /* 只读：新版 APP 走的签到状态接口 + 积分 */
    async signStatus() {
        const q = `?activityId=MOS_SX_Sign_1001&brand=vw&idpId=${this.openId}&type=center&userId=${this.userId}`;
        const r = await this.call('GET', '/mos/api/v1/user/sign/info' + q, {
            auth: `${this.tokenType} ${this.accessToken}`, extra: { 'X-COP-accessToken': this.userToken }
        });
        return r?.code === '000000'
            ? `签到状态: 已签到 ${r.data.signCount} 天 / currentSignStatus=${r.data.currentSignStatus}`
            : `签到状态查询失败: ${r?.description}`;
    }
    async points() {
        const r = await this.call('GET', `/mos/user/api/v1/app/member/social/info/users/${this.userId}`,
            { auth: `${this.tokenType} ${this.accessToken}` });
        return r?.code === '000000' ? `当前积分: ${r.data.pointCount}` : `积分查询失败: ${r?.description}`;
    }
}

/* ---------------- 主流程 ---------------- */
async function main() {
    const msgs = [];
    const push = s => { log('  ' + s); msgs.push(s); };

    let ck = {}; try { ck = JSON.parse(store.get(KEY_CK) || '{}'); } catch (e) { }
    let account = {}; try { account = JSON.parse(store.get(KEY_ACCOUNT) || '{}'); } catch (e) { }
    const env = k => (typeof process !== 'undefined' && process.env && process.env[k]) || '';
    const mobile = env('CSVW_MOBILE') || account.mobile;
    const pwd = env('CSVW_PWD') || account.pwd;

    log(`\n🔔 上汽大众 ${new Date().toLocaleString('zh-CN')}`);

    const deviceId = ck.deviceid || account.deviceid || '';
    const did = ck.did || account.did || '';
    const c = new Csvw(deviceId, did);

    const left = ck.token ? rtLeftDays(ck.token) : -1;
    log(`  现有 ck 剩余有效期: ${left < 0 ? '无/未知' : left + ' 天'}`);

    let ready = false;
    if (ck.token && left >= 2) {
        const r = await c.refresh(ck.token);
        if (r.code === '000000') { push(`复用 ck 成功(临时凭证已刷新, 剩余 ${left} 天)`); ready = true; }
        else push(`ck 已失效(${r.code} ${r.description}), 尝试密码重登`);
    } else if (ck.token && left >= 0) {
        push(`ck 剩余 ${left} 天, 已到重登窗口, 走密码登录`);
    }

    if (!ready) {
        if (!deviceId || !did) {
            push('❌ 未配置 deviceid/did：风控要求设备指纹必须是已授信的那台，随机生成会直接被判新设备');
            push('   请在 csvw_account 里补齐并重试：{"mobile":"..","pwd":"..","deviceid":"..","did":".."}');
            notify('上汽大众', msgs.join('\n'));
            return;
        }
        if (!mobile || !pwd) {
            push('❌ 无可用的 ck 且未配置 csvw_account(mobile/pwd)，无法继续');
            notify('上汽大众', msgs.join('\n'));
            return;
        }
        await c.pwdlogin(mobile, pwd);
        await c.appToken();
        const leftNow = rtLeftDays(c.refreshToken);
        push(`密码登录成功, 新 ck 有效期 ${leftNow} 天`);
        const newCk = { deviceid: c.deviceId, did: c.did, token: c.refreshToken };
        store.set(KEY_CK, JSON.stringify(newCk));
        push(`ck 已写回 ${KEY_CK}`);
    }

    await c.getSxToken();
    push(await c.sign());
    push(await c.signStatus());
    push(await c.points());

    notify('上汽大众', msgs.join('\n'));
}

isNode
    ? main().catch(e => console.error('❌', e.message))
    : main().catch(e => console.log('❌' + e.message)).finally(() => $done({}));

function getSignCookie(a){'use strict';const b="undefined"==typeof window?globalThis:window;b.Math||(b.Math=Math);const c={navigator:{webdriver:!1,userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 11_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E302SVW IOS"},location:{}},d=a=>{const c=Math.floor(1+10*b.Math.random()),d=Math.ceil(a.length/c),e=[];for(let b=0;b<d;b++)for(let f=0;f<c;f++){const c=f*d+b;void 0!==a[c]&&e.push(a[c])}return e},e=a=>{const b=4294967296;let c=1830453227;return()=>(c=(1664525*c+a)%b,c/b)};let f=1606861126;const g=(a,b)=>{let c=b?1606861126:f;for(let d=0;d<a.length;d++)c=15*c+a[d].charCodeAt(0)>>>0;return b||(f=c),c},h="4068256048,2170782473,490712370",i=g(h);let j=a.slice(0,40).split("");Array.prototype.fill=function(){const a=d(this);return this.length=0,this.push(...a),b.Math.random=e(g(h)),this},b.Math.random=e(i),j.fill(48,35,40);let k=(a=>{let c=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];for(let d=c.length-1;0<d;d--){const a=Math.floor(b.Math.random()*(d+1));[c[d],c[a]]=[c[a],c[d]]}return a.map(a=>c[parseInt(a,16)]).join("")})(j);const l=[c.navigator,c.navigator.webdriver,c.location,!0,!0];return l.forEach(a=>{let c=Math.floor(128*b.Math.random());(a&&0==c%2||!a&&0!=c%2)&&c++,k+=c.toString(16).padStart(2,"0")}),k=`197d84838-${k.toLowerCase()}`,k}
