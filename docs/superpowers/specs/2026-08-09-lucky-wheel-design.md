# 大转盘在线抽奖 Web 应用 — 设计文档

- 日期:2026-08-09
- 主题:大转盘(lucky wheel)风格在线抽奖 Web 应用
- 技术栈:原生 HTML / CSS / JavaScript(ES modules,零构建零依赖)
- 使用场景:纯前端 Demo / 玩具(无后端、无账号、无金钱)

## 1. 目标与范围

构建一个单页大转盘抽奖应用:用户点击「开始抽奖」,转盘旋转减速后停在指针下,弹出中奖结果。支持奖品配置(增删改、权重、颜色)与本地存储、抽奖历史记录(最近 50 条)。

**范围内(本期实现)**

- 核心:转盘旋转 + 减速停止 + 中奖提示。
- 奖品可配置(名称、权重、颜色) + localStorage 持久化。
- 抽奖历史记录(上限 50 条)。

**范围外(YAGNI,本期不做)**

- 音效、撒花/彩纸动画。
- 结果分享(复制文本 / 截图)。
- 主题 / 皮肤切换。
- 后端、账号、库存、防刷、可验证随机数、合规。

## 2. 架构与模块职责

纯原生、零构建、ES modules(`<script type="module">`,现代浏览器原生支持,无需打包)。

```
index.html              # 页面结构,引入 css/js
css/style.css           # 样式(转盘容器、面板、弹窗、响应式)
js/storage.js           # localStorage 层:load/save 奖品配置 + 历史
js/prize-engine.js      # 纯逻辑:按权重抽中 winner、算目标旋转角
js/wheel.js             # Canvas 绘制扇形/标签/指针 + rAF 旋转动画
js/ui.js                # DOM 操作:编辑面板、历史面板、中奖弹窗
js/app.js               # 启动:初始化状态、绑事件、首屏渲染
tests/index.html        # 零依赖测试页:加载逻辑模块跑断言,浏览器看绿/红
tests/runner.js         # 极简 assert/it runner(无 npm)
```

模块边界(单一职责、可独立测试):

- **storage.js**:只管序列化/反序列化与 key 命名,不知道业务。
- **prize-engine.js**:纯函数,无 DOM。`pickWinner(prizes) → index`(加权随机)、`targetRotation(prizes, winnerIndex, currentRotation) → 度数`(保证指针落在中奖扇形中心,并累加至少 N 圈)。
- **wheel.js**:`Wheel` 类,持 canvas 句柄;`draw(prizes, rotation)` 重绘、`spin(target, durationMs, easing) → Promise` 用 rAF 减速到目标角。不碰数据来源。
- **ui.js**:增删改奖品表单、历史列表、结果弹窗的 DOM 读写;调 engine 算中奖、调 wheel 转动画。
- **app.js**:粘合层,bootstrap + 事件绑定,不写算法。

关键隔离:`prize-engine.js` 是纯函数(可单测);`wheel.js` 只画不决策;`ui.js` 只编排 DOM 不算中奖;`app.js` 只粘合。每个文件都能独立 hold 在 context 里、独立改。

## 3. 数据模型与持久化

### 3.1 Prize(奖品)

```
{ id: string, name: string, weight: number, color: string }
```

- `id`:唯一,作引用键。
- `weight`:正整数;**中奖概率 ∝ weight,扇形弧长也 ∝ weight**(视觉所见即真实概率,直觉一致)。
- `color`:扇形填充色(十六进制);内置调色板,缺省自动分配。

### 3.2 Prize 列表

`Prize[]`,按数组顺序从顶部顺时针渲染。

### 3.3 HistoryEntry(历史)

```
{ ts: number, prizeId: string|null, prizeName: string }
```

- 快照 `prizeName` 在抽奖时点的值(奖品后来改名/删除不破坏历史)。
- `prizeId` 可为 `null`(奖品已删)。
- 上限 50 条,超出删最旧的,避免 localStorage 膨胀。

### 3.4 localStorage schema

单 key 命名空间 + 版本字段:

```
key:   "devflow-wheel:v1"
value: { version: 1, prizes: Prize[], history: HistoryEntry[] }
```

### 3.5 加载与保存策略

- **加载**:解析 → 校验(`prizes.length ≥ 1`、所有 `weight > 0`、`name` 非空、`sum(weight) > 0`)→ 任一失败则回退内置默认奖品集并 `console.warn`。
- **保存**:每次奖品增删改、每次抽奖后写入。单 key 整存,一次 IO 完成一致性快照。
- **内置默认奖品**(首屏/回退用):8 个示例(如「一等奖 / 二等奖 / 谢谢参与 / …」),权重递减,色板循环。

## 4. 转盘绘制与旋转动画

### 4.1 绘制(`wheel.js` 的 `draw(prizes, rotation)`)

- Canvas 正方形,内部分辨率按 `devicePixelRatio` 缩放保证锐利;CSS 控制显示尺寸做响应式。
- 每个奖品:`arc_i = (weight_i / totalWeight) * 2π`,累加得扇形 `[start_i, end_i)`。`ctx` 平移到圆心后 `rotate(rotation)` 再画扇形,实现整盘旋转。
- 扇形填充 `prize.color`、白色分隔线、奖品名沿径向旋转放置在 `0.7R` 处。
- **指针固定在 12 点钟方向(顶部),用 DOM 叠加(CSS 三角),不在 canvas 里画**——更清晰、不随盘转。
- **角度单位约定**:对外 API(`draw` 的 `rotation`、`spin` 的 `target`、`targetRotation` 返回值)一律用**度**;`wheel.js` 内部喂 `ctx.rotate` 时转弧度(`rad = deg * π / 180`)。

### 4.2 中奖与目标角(`prize-engine.js`,纯函数,可单测)

Canvas 角度约定:0=右(3 点)、顺时针递增、90=下、**270=上(指针位)**。

- `pickWinner(prizes)`:加权随机选 `winnerIndex`(概率 ∝ weight)。
- `targetRotation(prizes, winnerIndex, currentRotation)`:
  1. 算中奖扇形中心角 `center_i`。
  2. 在扇形内部取随机抖动 `delta ∈ [-(arc/2 - ε), +(arc/2 - ε)]`(指针明显落在扇内、不压分隔线);`ε = 3°` 边距(若扇形弧 ≤ 2ε 则 `delta = 0`)。
  3. 令 `rotation ≡ 270 - (center_i + delta) (mod 360)` 使之对齐指针。
  4. 在 `currentRotation` 基础上**加 ≥5 整圈**前进,返回大于当前的绝对目标角(度)。
     - `base = (270 - center_i - delta) mod 360`(归一化到 `[0,360)`)
     - `k = 5 + ceil((current - base) / 360)`(修正:保证每抽 `result - current ≥ 5·360`,即恒前进 ≥5 整圈;原 `k = max(5, ceil((current - base)/360) + 1)` 仅保证 `result > current`,不满足"加 ≥5 整圈前进",已弃用)
     - `return base + 360 * k`(`result mod 360 = base`,指针落点正确)

### 4.3 动画(`wheel.js` 的 `spin(target, durationMs, easing) → Promise`)

- rAF 循环:`t = (now - start) / duration` 限幅 [0,1];`easeOutQuart(t) = 1 - (1-t)^4`;`angle = current + (target - current) * eased`;每帧 `draw`。
- `t ≥ 1` 落定 → resolve → `app` 收到后弹中奖、写历史、解锁按钮。
- 旋转期间禁用 spin 按钮、忽略点击;`durationMs ≈ 4500`(`prefers-reduced-motion` 时降到 ~600ms)。

### 4.4 关键不变量

- 目标角永远 > 当前角(恒前进)。
- 指针最终必落在中奖扇形内部(视觉与逻辑一致,不会「看着像 A 却中了 B」)。

## 5. 交互、边界与测试

### 5.1 页面布局

单页,响应式(窄屏纵向堆叠):

- 顶部:标题。
- 中央:**转盘**(canvas + 顶部 DOM 指针 + 圆心「开始抽奖」按钮)。
- 左/下:**编辑面板**(奖品列表行:名称输入、权重输入、颜色 picker、删除按钮 + 「添加奖品」「恢复默认」按钮)。
- 右/下:**历史面板**(最近 50 条:时间 + 奖品名 + 「清空」)。
- 中奖后:**结果弹窗**(遮罩 + 「中奖:XXX」+ 「再抽一次」/「关闭」)。

### 5.2 交互流程

1. 启动:`storage.load()` → 校验失败回退默认 → 绘盘 + 渲染编辑表单 + 渲染历史。
2. 抽奖:点「开始」→ 禁用按钮 → `pickWinner` → `targetRotation` → `wheel.spin()` → 落定 → 弹窗 + push 历史 + `storage.save()` → 解锁。
3. 编辑:输入变更 → 校验通过 → 更新状态 + `redraw` + save;增删奖品同理;「恢复默认」需二次确认。
4. 清空历史:二次确认 → wipe + save。
5. 窗口 resize:重设 canvas 分辨率 + 按当前角度重绘。

### 5.3 边界处理

- 仅剩 1 个奖品:禁用其删除按钮。
- 权重非正/非数:`blur` 时 clamp 到 `1`;名称空:阻止保存并内联提示「名称不能为空」。
- storage 写失败(quota / 隐私模式):`catch` + `console.warn`,内存态继续可用。
- 旋转中重复点击:按钮禁用 + 忽略。
- `prefers-reduced-motion`:`durationMs` 降到 ~600ms(仍转但不长拖)。

### 5.4 测试策略(零构建,纯浏览器)

- `tests/index.html` 用原生 `<script type="module">` 加载 `js/*.js`;`tests/runner.js` 是极简 `it/expect` runner,打印通过/失败数。
- **只单测纯逻辑**(无 DOM):
  - `pickWinner`:跑 10000 次,断言分布容差、返回索引合法、单奖品恒返回 0。
  - `targetRotation`:返回 > current;`(rotation mod 360)` 使指针落进中奖扇形弧内;≥5 整圈;抖动不出扇形。
  - `storage` load/save 往返相等;损坏输入回退默认;版本不匹配走迁移/回退。
- **不单测**:canvas 绘制与 DOM(视觉,留手动 checklist:转盘可见、指针固定、中奖弹窗正确、编辑即时重绘、历史可清)。
- TDD 顺序:writing-plans → test-driven-development 时先写这些测试(RED)再实现(GREEN)。

## 6. 实现顺序(高层,供 writing-plans 细化)

1. 脚手架:`index.html` + `css/style.css` + 空 `js/*.js` 模块占位 + `tests/` 骨架,确保页面可打开、模块可 import。
2. `storage.js`(+ 测试):load/save/校验/回退默认。
3. `prize-engine.js`(+ 测试):`pickWinner`、`targetRotation`。
4. `wheel.js`:`draw` 先能静态画盘;再 `spin` + rAF + easing。
5. `ui.js`:编辑面板、历史面板、结果弹窗。
6. `app.js`:bootstrap + 事件绑定 + 联调(抽奖全链路、编辑实时重绘、历史清空)。
7. 响应式 + 边界收尾(`prefers-reduced-motion`、resize、删除最后一项禁用等)。

每步遵循 TDD:纯逻辑先写测试(RED)→ 实现(GREEN)→ 重构。
