## Context

仓库当前是纯文档框架(devflow),无应用代码、无 `package.json`、无构建工具。本变更新增首个可运行应用。约束:纯前端、零构建、零 npm 运行时依赖,双击 `index.html`(或经静态服务器)即跑。浏览器环境假设:现代 evergreen 浏览器(原生 ES modules、Canvas 2D、`requestAnimationFrame`、`localStorage`、`devicePixelRatio`、`prefers-reduced-motion`)。动机见 `proposal.md - Why`;行为要求见 `specs/lucky-wheel/spec.md`。

## Goals / Non-Goals

**Goals:**

- 单页可运行,模块边界清晰、可独立测试。
- 抽奖的**视觉结果与逻辑结果一致**:指针对准的扇形就是被抽中的奖品。
- 配置与历史在浏览器本地持久化,单一致快照。
- 纯逻辑(抽奖概率、目标角几何、存储序列化)可单测,无需构建工具。

**Non-Goals(超出 specs 范围,本期不做):**

- 后端、账号、库存、防刷、可验证随机数、合规。
- 音效、撒花/彩纸、分享、主题切换。
- canvas 的屏幕阅读器 a11y(结果弹窗走 DOM 文本,可被朗读,已覆盖"结果可见"需求)。
- 多语言(i18n)。

## Decisions

### D1. 原生 JS + ES modules,零构建

模块以 `<script type="module">` 原生加载,无需打包。理由:最大化可移植性(Demo 可双击运行),零安装门槛,契合"玩具/Demo"定位。
**备选**:Vite + React/Vue + TS——更易扩展但引入 npm/build 依赖与构建步骤,与零构建目标冲突,拒绝。

### D2. Canvas + requestAnimationFrame 渲染与动画(`Wheel` 有状态类)

转盘用 `<canvas>` 画扇形/分隔线/奖品名,`rAF` 驱动旋转并用 `easeOutQuart` 减速。理由:对任意扇形数量都能精确绘制、动画最丝滑、单文件自包含、扇形/标签/分隔全可控。
**`Wheel` 状态模型**:构造 `new Wheel(canvas)` 持内部状态 `this.rotation`(初 0)、`this.prizes`。方法:`setPrizes(p)` 存并 `draw()`、`getRotation()` 返回当前角、`draw()` 用 `this.prizes`+`this.rotation` 重绘、`spin(target, durationMs, easing) → Promise` 从 `this.rotation` 动画到 `target` **落定后 `this.rotation = target`**(由 wheel 自管,杜绝 app 持陈旧角导致次抽反向转)、`resize()` 按 `this.rotation` 重设 canvas 并 `draw()`。app 只读 `getRotation()` 喂 `targetRotation`,不持有 rotation。
**备选**:SVG + CSS transition(文字更清晰、DOM 可编辑,但多圈旋转需自累加角度、分隔/指针样式要手写);CSS conic-gradient + transform(代码最少但 conic-gradient 不能画分隔线与奖品文字,体验差)。两者均拒。

### D3. 概率 ∝ 权重 ∝ 扇形弧长

中奖概率 `weight_i / total_weight`,扇形弧长同比例。理由:视觉所见即真实概率,直觉一致,适合玩具场景。
**备选**:概率与扇形面积解耦(小扇形可高概率)——视觉/概率不符会让人困惑,拒绝。

### D4. 先定中奖、再算目标角(Draw-then-animate)

`pickWinner` 先按权重抽中 `winnerIndex`,再由 `targetRotation` 算出使指针落在该扇形内的目标角,最后动画到该角。理由:**保证视觉=逻辑**,杜绝"看着像 A 却中了 B"或指针压分隔线。
**备选**:先随机角再读落到哪个扇形——指针可能压分隔线/边界,且概率要靠面积积分才对,复杂且易错,拒绝。

### D5. 单 key 命名空间 + 版本字段,原子整存

localStorage key `devflow-wheel:v1`,值为 `{ version, prizes, history }` 整体序列化一次写入。理由:一次 IO 即一致快照,无部分写导致 prizes/history 不一致。`version` 归属:`storage` 模块导出常量 `VERSION = 1`;`load()` 返回完整 state(`version` 恒为 `VERSION`);`save(state)` 接收完整 state 整写;`app` 持有并组装 state,`version` 由 `storage` 注入。`validate` 校验 `version === VERSION`,否则回退默认;prizes 合法但 history 损坏 → 仅重置 `history = []`(不丢弃 prizes)。
**备选**:prizes、history 各占一 key——两次写之间存在不一致窗口(写一半断电/异常),拒绝。

### D6. 指针用 DOM 叠加,不画进 canvas

指针是固定在 12 点钟方向的 CSS 三角形 div,叠在 canvas 上。理由:不随盘转、始终清晰、实现简单;canvas 只负责旋转的盘面。
**备选**:在 canvas 内画指针——需每帧重画且易与旋转坐标系混淆,拒绝。

### D7. 零构建纯浏览器单测

`tests/index.html` 用原生 `<script type="module">` import 纯逻辑模块,`tests/runner.js` 是极简 `it/expect` runner,打印通过/失败数。只测无 DOM 的纯函数(`prize-engine`、`storage` 序列化)。canvas/DOM 视觉留手动 checklist。
**备选**:Vitest 作 devDependency——破坏零构建、引入 npm,与定位冲突,拒绝。

### D8. 共享纯函数 `computeSegments(prizes)`(消除"视觉=逻辑"接缝漂移)

`prize-engine.js` 导出 `computeSegments(prizes) → [{ start, end, center, arc }]`,约定:**角度单位为度**(与 `targetRotation`、pointer 270°、mod 360 一致);从 `0°`(canvas +X 轴)起、**顺时针**累加、`arc_i = weight_i / total · 360`、`center_i = start_i + arc_i/2`、`Σarc = 360`。`wheel.draw` 与 `targetRotation` **均消费**此函数(`draw` 内部喂 `ctx.arc` 时把度转弧度)。理由:`draw`(视觉)与 `targetRotation`(逻辑)共用同一套起点/方向/单位约定,从根上保证指针对齐的是逻辑选中的扇形;且 `arc ∝ weight` 与「Pointer lands inside winner segment」落到**可单测**的纯函数接缝,而非依赖未测的 canvas 代码。
**备选**:在 `draw` 与 `targetRotation` 各自内联算扇形——约定漂移风险高、重复代码、不可单测,拒绝。

### D9. `normalizeWeight` + 调色板(新增奖品缺省色)

`prize-engine.js` 导出 `normalizeWeight(x) → ≥1`(非法/非正数 clamp 到 1)与 `DEFAULT_PALETTE[]`(十六进制色数组)。新增奖品自动按 `index % len` 循环取色,并避开与前一扇形同色(取下一个不同色)。理由:权重 clamp 是纯逻辑、应单测;新增奖品必须有缺省色否则用户每次手选负担重、且易相邻撞色。
**备选**:无缺省色强制用户输入——UX 差,拒绝。

## Risks / Trade-offs

- **[localStorage 配额/隐私模式写失败]** → `catch` 写异常,`console.warn`,本会话内继续用内存态;数据不持久但不崩溃。
- **[损坏存储导致首屏白屏]** → 加载即校验,任一字段非法回退默认奖品集并 `console.warn`,永不抛到 UI。
- **[长奖品名在窄扇形溢出]** → 文本绘制按角度截断/限长,超长 `…` 截断,保证不出扇形边界。
- **[加权分布单测的统计抖动]** → `pickWinner` 测试跑 10000 次取频率分布,用宽松容差带(如 ±2 个百分点);偶发抖动可重试,容差足够稳定。
- **[canvas 无屏幕阅读器支持]** → 结果以 DOM 弹窗文本呈现(可被 SR 朗读);转盘本身的非文本性在本期玩具范围可接受。
- **[resize 时 canvas 模糊]** → 按 `devicePixelRatio` 重设 canvas 像素尺寸并按当前角度重绘,保持锐利与连续。
- **[并发点击触发多次动画]** → 旋转中禁用 start 按钮 + 忽略点击,落定后才解锁。
- **[prefers-reduced-motion 用户仍要转]** → 不完全跳过动画,仅把 `durationMs` 从 ~4500ms 降到 ~600ms,保留"转+停"语义。

## Migration Plan

绿地新增,无迁移。回滚:删除新增文件(`index.html`、`css/`、`js/`、`tests/`)并清除浏览器 localStorage key `devflow-wheel:v1`(无服务端、无数据迁移风险)。该 key 仅本应用使用,不影响 devflow 框架自身文件。
