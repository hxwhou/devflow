# devflow

> 纯文档编排 **openspec + superpowers** 的 6 阶段编程框架。无代码、无脚本、无安装——一份 markdown 约定,告诉 agent 按顺序调哪些 skill。

## 这是什么

devflow 把 openspec(spec-driven development)和 superpowers(过程 skill 集)的现成 skill 用一条 6 阶段 workflow 串起来:

```
brainstorm → propose → review → apply → audit → archive
```

每个阶段只调对应 skill,阶段间靠入口/出口 checklist 衔接。框架本身**只是一堆 markdown**(`AGENTS.md` 瘦桩 + `docs/devflow-rules.md` 真相源 + 6 个 slash 命令薄壳),零 bash 脚本、零安装工具。

## 为什么(相对 easyflow)

easy-flow 是同类框架,但实现层过重(12 个 bash hooks、5 个 scorers、policies、hard-stops、agent-selector、install tooling)。devflow 砍掉所有机制层,直接用 openspec + superpowers 的原生 skill 编排,自己只掌控 workflow。详见 [docs/devflow-design.md](docs/devflow-design.md)。

## 前置依赖

- **opencode** + **superpowers 插件**(全局,marketplace 装)——提供 7 核心 + 4 条件 superpowers skill
- **openspec CLI**(`@fission-ai/openspec` 或 `@studyzy/openspec-cn`,Node ≥20.19)——archive 阶段用
- openspec skills 已 vendor 进本模板(`.opencode/skills/openspec-*/`,8 个),无需再 init

## 快速开始

```bash
git clone https://github.com/hxwhou/devflow.git
cd devflow
opencode
```

在 opencode 里跑 `/devflow:brainstorm` 开始,或直接说"建一个 X 功能"——agent 读 `AGENTS.md` + `docs/devflow-rules.md` 自动按 6 阶段走。

## 6 阶段 workflow

| 阶段 | 命令 | 入口 skill | 出口 |
|---|---|---|---|
| 1 brainstorm | `/devflow:brainstorm` | `brainstorming`(+`openspec-explore`可选) | 用户认可方向 |
| 2 propose | `/devflow:propose` | `openspec-propose`(或 new+continue) | OpenSpec 四件套 |
| 3 review | `/devflow:review` | `writing-plans` + 自检 + 可选 cross-review subagent | 用户 lock |
| 4 apply | `/devflow:apply` | `using-git-worktrees`→逐 task:`test-driven-development`+`openspec-apply-change`;≥4 独立→`dispatching-parallel-agents` | 测试绿 + commit |
| 5 audit | `/devflow:audit` | 项目 tooling + `requesting-code-review` | 问题归档或修 |
| 6 archive | `/devflow:archive` | `verification-before-completion`→`finishing-a-development-branch`→`openspec-verify-change`→`openspec-archive-change` | 归档完成 |

完整规则 + 每阶段入口/出口 checklist 见 [docs/devflow-rules.md](docs/devflow-rules.md)(通过 `opencode.json` 的 `instructions` 自动注入 context)。

## 项目结构

```
devflow/
  opencode.json                 # instructions: ["docs/devflow-rules.md"] — 自动加载规则
  AGENTS.md                     # 瘦桩:指路 + /init 防护
  LICENSE
  .opencode/commands/           # 6 个 /devflow:* 命令薄壳
  .opencode/skills/openspec-*/  # 8 个 vendored openspec skill
  openspec/config.yaml          # OpenSpec 配置
  docs/
    devflow-rules.md            # 真相源:6 阶段 + 全局规则 + checklist(/init 不碰)
    devflow-design.md           # 设计文档(选型/思路/框架)
```

> superpowers 是全局插件,**不 vendor**——每个 opencode 项目自动可用,故 `.opencode/skills/` 下只有 openspec。

## skill 使用总览

- **OpenSpec(vendor 8 个)**:`openspec-propose` / `openspec-apply-change` / `openspec-verify-change` / `openspec-archive-change`(核心 4)+ `openspec-sync-specs`(archive 传递依赖)+ `openspec-explore` / `openspec-new-change` / `openspec-continue-change`(可选/备选)
- **Superpowers(全局,7 核心 + 4 条件)**:`brainstorming` / `writing-plans` / `using-git-worktrees` / `test-driven-development` / `requesting-code-review` / `verification-before-completion` / `finishing-a-development-branch`(核心 7);`dispatching-parallel-agents` / `executing-plans`(或 `subagent-driven-development`)/ `systematic-debugging` / `receiving-code-review`(条件/按需 4)

核心串联 = OpenSpec 4 + Superpowers 7 = **11 个 skill**。

## 防 /init

opencode 的 `/init` 对已存在的 `AGENTS.md` 是"原地改进"(merge),会污染真相源。devflow 把框架真内容放 `docs/devflow-rules.md`,`AGENTS.md` 只留瘦桩——`/init` 只能改瘦桩,误改后 `git restore AGENTS.md` 即恢复。详见 [docs/devflow-design.md §3.8](docs/devflow-design.md)。

## 文档

- [docs/devflow-design.md](docs/devflow-design.md) — 完整设计(选型过程 / 实现思路 / 框架结构 / 相对 easyflow 的取舍)
- [docs/devflow-rules.md](docs/devflow-rules.md) — 运行时规则(6 阶段总览 + 全局规则 + 每阶段 checklist)

## License

MIT
