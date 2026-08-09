# Audit — add-lucky-wheel

> devflow audit 阶段产物。方法:项目 tooling(`npm test` + headless smoke + `openspec validate --strict`)+ `requesting-code-review` subagent(read-only,全量 diff)+ 自检 checklist(impl 匹配 spec / 边界 / 测试覆盖 / 性能)。

## Tooling 结果

- `npm test`(= `node tests/run-node.js`):**54/54 passed**(纯逻辑单测:storage 28 + prize-engine 22 + easeOutQuart 4)。
- `node tests/smoke.js`(headless 集成 smoke,DOM/canvas/rAF mock):**SMOKE OK**——`app.js init()` + 一次完整抽奖链路(pickWinner→targetRotation→wheel.spin→appendHistory→save→showResult)无抛错,结果弹窗正确显示中奖名。
- `openspec validate add-lucky-wheel --strict`:**valid**。

## 代码评审(requesting-code-review subagent)

评审范围 `6113e06..ac99d82`(5 个 commit)。结论:**无 Critical;1 个 Important;7 个 Minor**。核心评估:

- 架构 seams 干净(storage 纯 / prize-engine 纯 / wheel canvas / ui DOM / app 胶水)。
- **核心不变量"视觉=逻辑"数学正确**:`targetRotation` 几何经逐步验算——`result mod 360 = base`、`pointerLocal = (center+delta) mod 360 ∈ [start+ε, end-ε]`(严格不压分隔线)、`result − current ∈ [1800, 2160)` 即**每抽恒前进 ≥5 整圈**。`computeSegments` 被 `draw` 与 `targetRotation` 双消费(共享 seam 已落地,非仅文档)。
- 全 spec 覆盖:8 requirements / 24 scenarios 均有实现,无遗漏 scenario。
- 测试断言真实行为(distribution 10k 样本 ±2pp;storage stub localStorage 是合法 env fake 非 SUT mock;targetRotation 30–50 次随机断言两不变量)。
- TDD 抓到真实 bug:原 `k=max(5,ceil(...)+1)` 不满足 ≥5 整圈;修正为 `k=5+ceil((current−base)/360)` 并回写 design/tasks/brainstorm doc(带「修正」注)。过程透明,非 smell。
- 无 XSS:用户/存储来源字符串全走 `textContent`/`createTextNode`/`input.value`,从不 `innerHTML`。

## 修复(inline,本审计已修)

- **[P1] 响应式 canvas 椭圆化 + 指针漂移(901–1135px 视口)**:3 列 grid 在该宽度挤窄 wheel-stage,旧 CSS `width:400;height:400;max-width:100%` 使宽被缩而高固定 → 非方形显示盒配方形像素 buffer → 盘画成竖椭圆,指针(`top:calc(50%−200px−14px)` 硬编码)漂离盘缘。**修**:`index.html` 把 canvas+指针+按钮包进 `.wheel-wrap`;CSS 改 `#wheel{width:min(400px,100%);height:auto;aspect-ratio:1/1}`(恒方形),指针 `top:-14px`(锚定 wrap 而非 stage),spin 按钮相对 wrap 居中;`@media(max-width:900px)` 去掉硬编码尺寸仅留 `width:min(320px,100%)`。→ 现指针/按钮恒贴方形盘顶/中心,任意宽度不变形。
- **[Minor→spec 合规] 空名缺可见文字提示**:spec 明文「inline 'name cannot be empty' message」,旧实现仅红边。**修**:加 `<p id="edit-msg" role="alert">`;`ui.js` 空名时设 `名称不能为空`、合法时清空。
- **[Minor] `prefers-reduced-motion` 仅启动时采样一次**:旧 `DURATION` 是模块加载时常量,中途切换系统设置不生效。**修**:改为 `durationMs()` 函数,每次 `doSpin` 调用重读 `matchMedia`,严格满足 spec scenario。
- **[Minor] 历史条目级校验缺失**:`load` 仅检 `Array.isArray(history)`,单条损坏(如 `ts:'bad'`)存活,渲染成 `NaN-NaN`。**修**:加 `isValidEntry`(ts 数 / prizeId null|string / prizeName string),`load` 中 `every(isValidEntry)` 失败则整条历史重置并 warn。加 2 条单测锁定(54→... 已含)。

修复后:`npm test` 54/54、smoke OK、syntax 全清、validate valid。

## 延后(不阻塞,记为 fast-follow)

- **[Minor] 左半盘奖品名上下颠倒**:`wheel.js` draw 标签按 `center` 旋转,`center∈[90,270)` 时文字倒置。spec 未要求正立(非 scenario),且无浏览器无法盲改翻转方向(怕改更糟)。**延后**:实现时用 `if (90<center<270) rotate(+π); textAlign='left'; x=-(R-8)` 翻转,需浏览器目视确认。
- **[Minor] `validate` 与 `load` 在 history-corrupt 上有意分歧**:design D5 隐含但代码未注明。**延后**:design.md 加注「`validate` 严格拒绝 history 非数组;`load` 对 history 损坏做局部重置(保留 prizes)——此分歧有意,勿改」。
- **[Minor] `addPrize` id 用 `Date.now()+random` 可能同毫秒碰撞,且 `validate` 不查 id 唯一**:id 仅为装饰(历史快照 `prizeName`;engine 用索引),无害。**延后**:换 `crypto.randomUUID()`。
- **[Minor] `package.json` 未在 tasks 列出**:仅 `{"type":"module"}`+`test` 脚本,零依赖,与"零构建/零 npm 运行时依赖"spec 一致(不引入运行时依赖;`index.html` 仍双击即跑)。**延后**:在 design `Impact` 或 tasks 注一笔其用途(让 node 跑 ESM 单测)。

## 自检 checklist

1. **impl 是否匹配 spec?** ✓ 全 8 requirements / 24 scenarios 有实现;P1 修复后响应式 scenario 也满足。
2. **边界?** ✓ 单奖品 / 极小 arc(≤2ε→delta=0)/ 最后一个删除禁用 / 空名阻止 / 非法权重 clamp / reduced-motion / resize debounced / 并发抽奖禁用 / 损坏存储回退 / history 条目损坏局部重置。
3. **测试覆盖需求?** ✓ 纯逻辑全覆盖(storage/prize-engine/ease);"视觉=逻辑"接缝由 `computeSegments` + targetRotation 测试锁;集成由 smoke 覆盖。唯一未覆盖:canvas 像素级视觉(浏览器目视,见下)。
4. **性能?** ✓ rAF、小 canvas、单次小 localStorage 写、50 条历史——无瓶颈。

## 结论

- **P0/P1 遗留**:无(P1 已 inline 修)。延后项均为 Minor、非 spec scenario、低风险。
- **唯一未机器验证项**:canvas 像素级视觉外观(颜色/指针视觉位置/动画帧率/响应式布局)——smoke 验证控制流与逻辑,但 ctx 是 mock;**建议归档前在浏览器打开 `index.html`(~1024px 宽目视一遍 P1 修复)**。如视觉有问题可作为 follow-up change。

`[devflow] audit 完成 → 下一阶段:archive`
