# Tasks — add-lucky-wheel

> 纯逻辑任务用 devflow TDD 子步 `N.M.1~5`(写测试/跑红/实现/跑绿/重构)+ RED/GREEN 证据;canvas/DOM 视觉任务用「手动验证」子步(零构建下不单测视觉)。勾选 `N.M` 即该任务完成。
> 接口约定(跨任务共享,改前必读):`storage.VERSION=1`;`load()→{version,prizes,history}`;`save(state)` 接收完整 state;`prize-engine` 导出 `computeSegments(prizes)→[{start,end,center,arc}]`(度;0° 起、顺时针、`arc_i=weight_i/total·360`、`center_i=start_i+arc_i/2`、Σarc=360)、`pickWinner(prizes)→index`、`targetRotation(prizes,winnerIndex,currentRotation)→度`(ε=3°)、`normalizeWeight(x)→≥1`、`DEFAULT_PALETTE[]`;`Wheel` 为有状态类(`new Wheel(canvas)`,持 `rotation`/`prizes`,方法 `setPrizes/getRotation/draw/spin/resize`)。指针为 `index.html` 静态 markup(12 点钟)。

## 1. 脚手架

- [x] 1.1 页面与模块骨架
  - 建 `index.html`(引入 `css/style.css` + `js/app.js` 作 `<script type="module">`;含**静态指针元素**:固定 12 点钟、绝对定位叠加 canvas 的 CSS 三角 div)、`css/style.css`(空壳含指针样式)、`js/{storage,prize-engine,wheel,ui,app}.js`(各 export 空占位)。
  - 手动验证:浏览器打开 `index.html`,console 无报错;各模块可被 import;指针 div 可见在顶部。
- [x] 1.2 测试 runner 骨架
  - 建 `tests/index.html`(`type="module"` import `runner.js` + 待测模块)、`tests/runner.js`(极简 `it(name,fn)` + `expect(actual,expected)` + 通过/失败计数打印到 DOM)。
  - 手动验证:打开 `tests/index.html`,显示 "0 passed / 0 failed",无 console 报错。

## 2. 存储层(js/storage.js)— 纯逻辑, TDD

- [x] 2.1 `VERSION` 常量 + 默认奖品集 + `validate`
  - 2.1.1 写测试:`VERSION === 1`;`DEFAULT_PRIZES` 至少 6 项,每项 `weight>0`、`name` 非空、`color` 为十六进制;`validate(state)` 对 `version===VERSION` 且 prizes 合法返回 true;对 `version` 不符 / 空数组 / 含 `weight≤0` / 空名 / 非数返回 false;prizes 合法但 history 非数组返回 false(仅 history 校验位)。
  - 2.1.2 跑测试 → RED。
  - 2.1.3 实现 `VERSION`、`DEFAULT_PRIZES`、`validate(state)`(校验 version===VERSION、prizes 数组合法、history 为数组)。
  - 2.1.4 跑测试 → GREEN。
  - 2.1.5 重构(纯函数、无副作用)。
- [x] 2.2 `load()`:解析 + 校验 + 回退(含 history 局部重置)
  - 2.2.1 写测试:无 key → 返回 `{version:VERSION, prizes:DEFAULT_PRIZES, history:[]}`;损坏 JSON → 同样回退默认全量;`version` 不符 → 回退默认全量;prizes 合法但 history 损坏(非数组)→ 返回 `{version:VERSION, prizes:<原>, history:[]}`(只重置 history,不丢 prizes)。
  - 2.2.2 跑测试 → RED。
  - 2.2.3 实现 `load()`(读 `devflow-wheel:v1`、`JSON.parse` 包 try、`validate` 失败 `console.warn` 并回退全量默认;history 局部损坏时保留 prizes 重置 history)。
  - 2.2.4 跑测试 → GREEN。
  - 2.2.5 重构。
- [x] 2.3 `save(state)`:原子整存 + 写失败安全
  - 2.3.1 写测试:`save({version,prizes,history})` 后 `load()` 往返字段全等(含 `version`);stub `Storage.prototype.setItem`(sandbox + restore,避免污染真实 key)令其抛异常时 `save()` 不抛(吞掉并 `console.warn`)。
  - 2.3.2 跑测试 → RED。
  - 2.3.3 实现 `save(state)`(整对象 `JSON.stringify` 一次 `setItem`,try/catch)。
  - 2.3.4 跑测试 → GREEN。
  - 2.3.5 重构。
- [x] 2.4 历史条目形状 + 上限(50)+ 清空
  - 2.4.1 写测试:条目形状为 `{ts:number, prizeId:string|null, prizeName:string}`;`appendHistory(history, entry)` 在 50 条时再追加 → 长度仍 50 且最旧被踢;追加后该条目对 prizes 的后续改名/删除**免疫**(因为存的是 `prizeName` 字符串快照,断言改名后历史条目仍显旧名);`clearHistory()` 返回 `[]`。
  - 2.4.2 跑测试 → RED。
  - 2.4.3 实现 `appendHistory` / `clearHistory`(appendHistory 不可变返回新数组)。
  - 2.4.4 跑测试 → GREEN。
  - 2.4.5 重构。

## 3. 奖品引擎(js/prize-engine.js)— 纯逻辑, TDD

- [x] 3.1 `computeSegments(prizes)`:共享扇形几何(度)
  - 3.1.1 写测试:返回 `[{start,end,center,arc}]`,长度 = prizes 长度;`start_0 === 0`;`Σarc === 360`(容差 1e-9);`arc_i ≈ weight_i/total·360`(容差 1e-9);`start_{i+1} === end_i`(连续);`center_i === start_i + arc_i/2`;单奖品 `arc === 360`、`start===0`、`end===360`。
  - 3.1.2 跑测试 → RED。
  - 3.1.3 实现 `computeSegments(prizes)`(0° 起、顺时针累加)。
  - 3.1.4 跑测试 → GREEN。
  - 3.1.5 重构。
- [x] 3.2 `pickWinner(prizes)`:加权随机
  - 3.2.1 写测试:单奖品恒返回 0;固定权重数组跑 10000 次,各奖品频率 ≈ `weight_i/total` 容差 ±2pp;返回索引恒在 `[0, len)`;空数组抛错。
  - 3.2.2 跑测试 → RED。
  - 3.2.3 实现 `pickWinner`(累加权重 + `Math.random` 落区间)。
  - 3.2.4 跑测试 → GREEN。
  - 3.2.5 重构。
- [x] 3.3 `targetRotation(prizes, winnerIndex, currentRotation)`:指针对齐中奖扇形
  - 3.3.1 写测试:返回值 > currentRotation;`(返回值 mod 360)` 使指针(270°)落进 `winnerIndex` 扇形弧 `[start+ε, end-ε)` 内(ε=3°);额外整圈数 ≥ 5;`delta` ∈ `[−(arc/2−ε), +(arc/2−ε)]` 且为均匀随机(arc ≤ 2ε 时 delta=0);用 `computeSegments` 取几何(断言 targetRotation 调用了它,或等价地用 `computeSegments` 算期望区间验证)。
  - 3.3.2 跑测试 → RED。
  - 3.3.3 实现 `targetRotation`(`seg=computeSegments(prizes)[winnerIndex]`;`delta = arc>2ε ? (Math.random()*2-1)*(arc/2-ε) : 0`(均匀随机,ε=3°);`base=((270 − (seg.center + delta)) mod 360 +360) mod 360`;`k=5 + ceil((current−base)/360)`(**修正**:保证每次抽奖 `result−current ≥ 5·360`,原 `k=max(5,ceil(...)+1)` 只保证 `result>current` 不满足"≥5 整圈前进");`return base+360*k`,度单位)。
  - 3.3.4 跑测试 → GREEN。
  - 3.3.5 重构。
- [x] 3.4 `normalizeWeight` + `DEFAULT_PALETTE`
  - 3.4.1 写测试:`normalizeWeight(5)===5`;`normalizeWeight(0)===1`;`normalizeWeight(-3)===1`;`normalizeWeight(NaN)===1`;`normalizeWeight(2.7)===3`(round);`DEFAULT_PALETTE` 至少 6 色且全为合法十六进制。
  - 3.4.2 跑测试 → RED。
  - 3.4.3 实现 `normalizeWeight(x)=max(1, round(Number(x)||0))` 与 `DEFAULT_PALETTE`。
  - 3.4.4 跑测试 → GREEN。
  - 3.4.5 重构。

## 4. 转盘渲染与动画(js/wheel.js)— `Wheel` 有状态类;视觉手动验证 + 纯 ease 单测

- [x] 4.1 `Wheel` 类:`constructor` / `setPrizes` / `draw` / `getRotation`
  - `constructor(canvas)`:初始化 ctx、dpr 缩放、`this.rotation=0`、`this.prizes=[]`。`setPrizes(p)` 存并 `draw()`。`draw()`:清空;按 dpr 设像素尺寸;平移圆心 + `rotate(this.rotation·π/180)`;用 `computeSegments(prizes)` 取扇形,逐个 `arc` 填 `prize.color`、白色分隔线;奖品名沿径向旋转放 `0.7R`,**白色 `fillText` + 细 `strokeText` 描边**保证任意底色可读,长名截断 `…`。`getRotation()` 返回 `this.rotation`。
  - 手动验证:8 默认奖品扇形大小 ∝ 权重、色交替、分隔线可见、文字白底描边可读不溢出、指针(静态 div)在顶部不随盘转。
- [x] 4.2 `Wheel.spin(target, durationMs, easing) → Promise` + 纯 `easeOutQuart`
  - 4.2.1 写测试(纯,不实例化 Wheel):`easeOutQuart(0)===0`;`easeOutQuart(1)===1`;`easeOutQuart(0.5)===1−0.5^4=0.9375`;`easeOutQuart` 在 [0,1] 单调不减(采样 21 点);`t≥1→1`、`t<0→0`。
  - 4.2.2 跑测试 → RED。
  - 4.2.3 实现:导出纯函数 `easeOutQuart(t)=1−(1−t)^4`(夹紧 t 到 [0,1]);`spin` 用 rAF:`start=now`;每帧 `t=clamp((now−start)/duration,0,1)`、`eased=easeOutQuart(t)`、`angle=this.rotation+(target−this.rotation)*eased`、`draw()`;`t≥1` 时 `this.rotation=target`、`draw()`、resolve。
  - 4.2.4 跑测试 → GREEN(纯函数);手动验证:点击后顺向旋转、减速、停在目标;落定指针明显在中奖扇形内(非分隔线上);连续多次抽奖盘恒前进不倒转。
  - 4.2.5 重构。
- [x] 4.3 `Wheel.resize()`
  - `resize()`:按当前显示尺寸 + dpr 重设 canvas 像素尺寸,调 `draw()`(用 `this.rotation`,角度连续)。
  - 手动验证:拖拽窗口转盘不模糊、不偏移、角度不跳变。

## 5. UI 层(js/ui.js)— DOM,手动验证

- [x] 5.1 编辑面板(增删改 + 校验 + 最后一个保护 + 自动取色)
  - 渲染奖品行(名称 input、权重 input、颜色 picker、删除按钮);「添加奖品」(新奖品颜色按 `DEFAULT_PALETTE[index%len]` 循环取,与前一扇形同色则取下一个不同色)、「恢复默认」(二次确认);权重 input `blur` 经 `normalizeWeight` 写回并 clamp 显示;空名阻止保存并内联提示「名称不能为空」;仅剩 1 项时禁用其删除按钮。
  - 手动验证:增删改即时重绘盘面 + 持久化;删到最后一个删除按钮变灰;空名出现提示且不保存;新增奖品自动有合理颜色且不与邻居撞色;「恢复默认」弹确认。
- [x] 5.2 历史面板
  - 渲染最近 50 条(`ts` 格式化时间 + `prizeName`);「清空」二次确认。
  - 手动验证:抽奖后历史增长;改/删奖品后旧条目仍显示当时名;满 50 后旧条滚出;清空后清空且刷新仍空。
- [x] 5.3 结果弹窗
  - 落定后弹遮罩 + 「中奖:XXX」+「再抽一次」/「关闭」;关闭后解锁 start(与编辑面板)。
  - 手动验证:弹窗出现正确奖品名;关闭后可再抽、编辑面板恢复可用。

## 6. 启动与联调(js/app.js)— 集成,手动验证

- [x] 6.1 启动:`storage.load()` → 校验失败回退默认 → `wheel.setPrizes(state.prizes)` + 渲染编辑表单 + 渲染历史。
- [x] 6.2 抽奖链路:点「开始」→ 禁用 start **与编辑面板** → `winner=pickWinner(prizes)` → `target=targetRotation(prizes, winner, wheel.getRotation())` → `await wheel.spin(target, dur, ease)`(wheel 落定后自管 `this.rotation`,无需 app 回写)→ 弹窗 + `state.history=appendHistory(state.history, {ts:Date.now(), prizeId:prizes[winner].id, prizeName:prizes[winner].name})` + `save(state)` → 解锁。
- [x] 6.3 编辑变更处理:输入/增删/恢复默认 → 更新 `state.prizes` + `wheel.setPrizes` + `save(state)`。
- [x] 6.4 `prefers-reduced-motion`:`matchMedia('(prefers-reduced-motion: reduce)')` 命中则 `durationMs=600`,否则 `4500`(精确值)。
- [x] 6.5 resize 监听接 `wheel.resize()`。
  - 手动验证(6.1–6.5 合并):首次打开盘面+编辑+历史正确;完整抽奖链路(含禁用/解锁、连续多次不倒转);编辑即时重绘并持久化;刷新后状态恢复;改 `prefers-reduced-motion` 后动画变短;resize 不破坏。

## 7. 收尾验证

- [x] 7.1 手动 checklist 全过(转盘可见/指针固定不随盘转/中奖弹窗正确/编辑即时重绘/历史可清/resize 正常/存储异常不崩/连续抽奖恒前进)。
- [x] 7.2 `openspec validate add-lucky-wheel --strict` 通过(若 CLI 支持)。
