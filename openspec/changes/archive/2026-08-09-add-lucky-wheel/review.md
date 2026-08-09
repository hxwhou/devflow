# Review — add-lucky-wheel

> devflow review 阶段产物。方法:writing-plans 自检(spec 覆盖 / 占位符 / 接口一致性)+ devflow 五问自检(架构/数据流/边界/测试覆盖/性能)+ cross-review subagent(general,读四件套找漏洞)。

## 结论

四件套结构完整、`openspec validate --strict` 通过、`targetRotation` 几何经逐步验算**正确**、`pickWinner` / `easeOutQuart` / 历史上限逻辑正确。但存在 1 个 P0 与若干 P1,集中在**接口形状不一致**与**纯函数未共享/未测**,会使 apply 阶段产生实现歧义甚至引入"第二抽反向转"的 bug。需修订后 lock。

## P0(必须先于 apply 修复)

### R1 `load`/`save`/`version` 形状不一致
- **问题**:`design D5` + spec「Single atomic snapshot」要求存储 blob = `{version, prizes, history}`;但 `tasks 2.2.1` 断言 `load()` 返回 `{prizes, history}`(无 `version`),`2.3.1` 又要求 round-trip「字段全等」——二者矛盾。`save(state)` 入参形状与 `version` 归属均未定义。
- **决策**:`storage` 模块导出常量 `VERSION = 1`。`load()` 返回完整 state `{version, prizes, history}`(`version` 恒为 `VERSION`);`save(state)` 接收完整 state 并整写。`validate` 校验 `version === VERSION`,否则回退默认。`app.js` 持有并组装 state,`version` 由 `storage` 注入。
- **改动**:tasks 2.2 / 2.3 / 2.1(validate 加 version);design D5 注明归属。

## P1(应修复)

### R2 `Wheel` 状态模型自相矛盾 + 第二抽反向转风险
- **问题**:`draw(prizes, rotation)` 无状态(参数传入),但 `spin(target, durationMs, easing)` 的缓动公式 `angle = current + (target−current)*eased` 与 4.3 resize 读「当前 rotation」都需内部状态,签名缺 `current`/`prizes`。更严重:6.2 抽奖链路**没有**在 spin 后更新 `currentRotation` → 下一次 `targetRotation` 用陈旧 `current` 算 `k`,可能 `result ≤ 视觉当前角` → 盘**反向**转(验算:`current=0` 首抽 `target=2069`;次抽 `base=100` → `k=5` → `target=1900 < 2069`,倒转 169°)。
- **决策**:改 `Wheel` 为**有状态类**:`new Wheel(canvas)` 持 `this.rotation`(初 0)、`this.prizes`。方法:`setPrizes(p)`、`getRotation()`、`draw()`(用 `this.prizes`+`this.rotation`)、`spin(target, durationMs, easing)→Promise`(从 `this.rotation` 动画到 `target`,**落定后 `this.rotation = target`**)、`resize()`(用 `this.rotation`+`draw`)。app 调用 `winner=pickWinner(prizes); target=targetRotation(prizes, winner, wheel.getRotation()); await wheel.spin(target, dur, ease);`——wheel 自管 rotation,无需 app 手动回写,杜绝陈旧。
- **改动**:tasks 4.1/4.2/4.3、6.2;design D2 Wheel 描述。

### R3 共享纯函数 `computeSegments` 缺失 → 「视觉=逻辑」接缝未测
- **问题**:扇形几何 `arc_i = weight_i/total·2π`、起止角、中心角 同时被 `wheel.draw`(4.1)和 `prize-engine.targetRotation`(3.2)需要,但未抽取为共享纯函数,且 3.2.1 的测试只检 `targetRotation` 内部自洽(对 `draw` 是套套逻辑),**无法保证** draw 与 targetRotation 用同一套起点/方向约定。若 draw 从 270° 起或逆时针,`targetRotation` 会整体偏移 → 指针落错扇形。
- **决策**:在 `prize-engine.js` 新增纯函数 `computeSegments(prizes) → [{start, end, center, arc}]`,**约定**:从 0°(canvas +X 轴)起、顺时针累加、`center_i = start_i + arc_i/2`。单测:弧长 ∝ 权重、起点 0、首尾连续、`Σarc = 2π`。`wheel.draw` 与 `targetRotation` 均**消费**它,从根上消除约定漂移,并把 spec「Visual matches probability」「Pointer lands inside winner segment」落到可测接缝。
- **改动**:tasks 新增 3.0(`computeSegments`);3.2 改为消费它;4.1 改为消费它。

### R4 指针 DOM 元素无主
- **问题**:design D6 指针为 CSS 三角 div 叠加,但无任务创建它(1.1 骨架未含,4.1/5.x 也无)。
- **决策**:指针为 `index.html` 静态 markup(固定 12 点钟,绝对定位叠加 canvas),不写进 canvas 也不由 JS 动态创建。
- **改动**:tasks 1.1 注明。

### R5 `ε` / `delta` / 历史条目形状未定义
- **问题**:`ε` 无具体值;`delta` 未说是随机抖动还是固定 0;历史条目字段键未固定(`{timestamp,name}` vs `{ts,prizeName}` 跨 storage↔ui 风险);`load` 对「history 损坏但 prizes 合法」的处理未定。
- **决策**:`ε = 3°`(design §4.2 已有,补进 tasks);`delta` 在 `[−(arc/2−ε), +(arc/2−ε)]` 内**均匀随机**(arc ≤ 2ε 时 `delta=0`);历史条目固定 `{ ts: number, prizeId: string|null, prizeName: string }`(对齐 design §3.3);`load` 中若 prizes 合法但 history 损坏 → 仅重置 `history=[]`,不丢弃 prizes。
- **改动**:tasks 3.2 / 2.4 / 2.2。

### R6 新增奖品缺省色 + 权重 clamp 未抽纯函数
- **问题**:5.1 添加奖品未定默认色(用户必填?调色板?相邻撞色?);权重 clamp-to-1 是纯逻辑但只在 5.1 手动验证,无单测。
- **决策**:`prize-engine.js` 加纯函数 `normalizeWeight(x) → ≥1` 与 `DEFAULT_PALETTE[]`;新增奖品自动循环取色(避开与前一个相邻同色);`normalizeWeight` 单测。
- **改动**:tasks 新增 3.3;5.1 引用之。

## P2(已记,轻量处理)

- 历史条目「survives rename」:由存 `prizeName` 字符串快照天然满足,2.4 测试加一条断言。
- `easeOutQuart` 纯函数:作为 `wheel.js` 导出,4.2 加纯测(单调增、`t∈[0,1]→[0,1]`、`t≥1→1`)。
- localStorage mock:2.3.1 测试 stub `Storage.prototype.setItem`(sandbox + restore),避免污染真实 `devflow-wheel:v1`。
- 文字对比度:4.1 文字白色 + 细描边(`strokeText`)保证任意底色可读。
- `durationMs`:固定 `4500`(常态)/ `600`(reduced-motion),去掉「≈」。
- 旋转中禁用编辑面板:6.2 禁用 start **与** edit 面板,落定后解。
- spec 第 115 行笔误「long拖」→ 改「long deceleration」。
- `version` 字段:保留(`VERSION=1`),`validate` 校验,为将来迁移留口;本期无迁移消费者(YAGNI 可接受,spec 已要求)。
- 「恢复默认」按钮:spec 无对应 scenario,属轻 scope-creep,但 UX 合理且低成本,保留,不动 spec。

## 五问自检

1. **架构**:模块单一职责、纯逻辑与 DOM/canvas 隔离清晰 ✓。修 R2 后 `Wheel` 有状态但职责单一(只画只转)。
2. **数据流**:state 由 `app` 持有;`storage.load→state→render`;edit→mutate+save+redraw;draw 链路 `pickWinner→targetRotation(getRotation)→spin(自管 rotation)→appendHistory+save`。修 R2/R3 后无陈旧状态、无约定漂移。
3. **边界**:最后一个奖品保护、非法权重 clamp、空名、存储写失败吞、并发点击禁用、reduced-motion、resize、损坏回退、history 损坏局部重置(R5)——全覆盖。
4. **测试覆盖**:纯逻辑(`computeSegments` R3、`pickWinner`、`targetRotation`、`normalizeWeight` R6、`easeOutQuart`、`storage` load/save/validate、history cap)均有单测;视觉/DOM 手动。修 R3 后「视觉=逻辑」接缝可测。
5. **性能**:rAF、小 canvas、单次小 localStorage 写、50 条历史——无瓶颈 ✓。

## 落地清单(改哪些文件)

- `tasks.md`:新增 3.0 `computeSegments`、3.3 `normalizeWeight`/调色板;改 2.1/2.2/2.3(version+history 校验)、2.4(条目形状+survive-rename 断言)、3.2(消费 computeSegments、ε=3°、delta 随机)、4.1/4.2/4.3(Wheel 有状态模型、easeOutQuart 纯测、文字描边)、5.1(自动取色+normalizeWeight)、6.2(spin 自管 rotation+禁用 edit)、6.4(durationMs 固定值)、1.1(指针静态 HTML)。
- `design.md`:D2 改 Wheel 有状态类描述;D5 注明 `VERSION` 归属;补 `computeSegments` 共享纯函数(R3)与 `normalizeWeight`/调色板(R6)决策。
- `specs/lucky-wheel/spec.md`:仅修笔误「拖」(行为契约不变,不改 scenario)。

修订后请用户 `lock`,再进 `/devflow:apply`。
