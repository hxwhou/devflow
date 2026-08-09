# devflow

> 纯文档编排 **openspec + superpowers** 的编程框架。一份 markdown 约定,告诉 agent 按顺序调哪些 skill,把"想法"变成"上线"。无代码、无脚本、无安装工具。

## 这是什么

devflow 用一条 6 阶段 workflow 把 openspec(spec-driven)和 superpowers(过程 skill)的现成 skill 串起来:

```
brainstorm → propose → review → apply → audit → archive
```

框架本身只是一堆 markdown(`AGENTS.md` 瘦桩 + `devflow-rules.md` 真相源 + 6 个 slash 命令薄壳)。相对同类框架砍掉了所有机制层(bash hooks / scorers / agent-selector / install tooling),直接用原生 skill 编排,自己只掌控 workflow——详见 [docs/devflow-design.md](docs/devflow-design.md)。

## 前置依赖

- **opencode** + **superpowers 插件**(全局,marketplace 装)
- **openspec CLI**(`@fission-ai/openspec` 或 `@studyzy/openspec-cn`,Node ≥20.19)
- openspec skills 已 vendor 进模板(`.opencode/skills/openspec-*/`),无需再 init

## 怎么用

```bash
git clone https://github.com/hxwhou/devflow.git
cd devflow
opencode
```

在 opencode 里跑 `/devflow:brainstorm`,或直接说"建一个 X 功能"——agent 读 `AGENTS.md` + `devflow-rules.md` 自动按流程走。

**代理自判 route**:agent 读完你的请求即判走哪条,打 `[devflow] 判定 ...`,你可一句话覆盖。
- **fast-track**(小改动:单文件 / ≤5 task / 无跨切面):一条龙串接 propose→apply→archive,跳 review/audit,pre-design 留对话不落盘
- **full**(大改动:跨模块 / auth / 迁移):逐阶段 6 步,每阶段出口停下等你

## 6 阶段

| 阶段 | 命令 | 干什么 |
|---|---|---|
| 1 brainstorm | `/devflow:brainstorm` | 探索意图、定方向(**入口自判 route**) |
| 2 propose | `/devflow:propose` | 生成 openspec change(proposal/specs/tasks) |
| 3 review | `/devflow:review` | 评审、找漏洞、锁定(fast-track 跳过) |
| 4 apply | `/devflow:apply` | 隔离 worktree + TDD 实施(fast-track:inline + 模块级) |
| 5 audit | `/devflow:audit` | 质量审计(fast-track 跳过) |
| 6 archive | `/devflow:archive` | 终验 + 合回 + 归档 |

完整规则 + 规模判定 + 每阶段入口/出口 checklist 见 [devflow-rules.md](devflow-rules.md)(通过 `opencode.json` 的 `instructions` 自动注入 context)。

## 项目结构

```
devflow/
  opencode.json                 # instructions: ["devflow-rules.md"] — 自动加载规则
  AGENTS.md                     # 瘦桩:指路
  devflow-rules.md              # 真相源:6 阶段 + 全局规则 + 规模判定
  .opencode/commands/           # 6 个 /devflow:* 命令薄壳
  .opencode/skills/openspec-*/  # 8 个 vendored openspec skill
  openspec/config.yaml          # OpenSpec 配置
  docs/
    devflow-design.md           # 设计文档(选型/思路/取舍)
```

> superpowers 是全局插件,**不 vendor**——每个 opencode 项目自动可用,故 `.opencode/skills/` 下只有 openspec。

## 文档

- [devflow-rules.md](devflow-rules.md) — 运行时规则(自动加载)
- [docs/devflow-design.md](docs/devflow-design.md) — 完整设计(选型过程 / 实现思路 / 相对 easyflow 的取舍)

## License

MIT
