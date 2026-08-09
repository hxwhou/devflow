## Why

仓库目前是纯文档框架(devflow),无任何应用代码。需要一个**可运行的大转盘在线抽奖 Web 应用**作为首个真实功能:纯前端、零构建、双击即跑,供演示与二次开发。它也充当 devflow 6 阶段 workflow 的端到端示例产物。

## What Changes

- 新增单页抽奖应用:`index.html` + `css/style.css` + 模块化 `js/*.js`(storage / prize-engine / wheel / ui / app),使用原生 ES modules,零构建零依赖。
- 新增零依赖纯浏览器测试页 `tests/index.html` + `tests/runner.js`,覆盖纯逻辑单测。
- 不引入后端、账号、构建工具、npm 运行时依赖。
- 无 BREAKING 变更(绿地新功能)。

## Capabilities

### New Capabilities

- `lucky-wheel`:大转盘抽奖应用——奖品加权配置与本地持久化、Canvas 转盘绘制与 rAF 减速旋转动画、指针对齐中奖扇形、抽奖历史记录(上限 50)。

### Modified Capabilities

(无——绿地项目,openspec/specs/ 目前为空,无既有 capability 被修改。)

## Impact

- **新增代码**:`index.html`、`css/style.css`、`js/{storage,prize-engine,wheel,ui,app}.js`、`tests/{index.html,runner.js}`。
- **新增数据**:浏览器 localStorage key `devflow-wheel:v1`(奖品配置 + 历史)。
- **依赖**:无新增第三方依赖;仅用浏览器原生 API(Canvas 2D、`requestAnimationFrame`、`localStorage`、ES modules、`devicePixelRatio`、`prefers-reduced-motion`)。
- **影响范围**:仅本仓库工作树新增文件;不动现有 devflow 框架文件(`AGENTS.md`、`docs/`、`opencode.json`、`.opencode/`、`openspec/config.yaml`)。
