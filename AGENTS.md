# devflow

> 纯文档编排 openspec + superpowers 的 6 阶段编程框架。无代码、无脚本、无安装——只是一份 markdown 约定,告诉 agent 按顺序调哪些 skill。

完整设计见 `docs/devflow-design.md`。

## 前置依赖
- **opencode + superpowers 插件**(全局,marketplace 装)——提供 7 核心 + 4 条件 superpowers skill
- **openspec CLI**(`@fission-ai/openspec` 或 `@studyzy/openspec-cn`,Node ≥20.19)——archive 阶段用
- **openspec skills 已 vendor**——本模板 `.opencode/skills/openspec-*/` 自带 8 个,无需再 init

## 6 阶段总览
| 阶段 | 命令 | 入口 skill | 出口 |
|---|---|---|---|
| 1 brainstorm | `/devflow:brainstorm` | `brainstorming`(+`openspec-explore`可选) | 用户认可方向 |
| 2 propose | `/devflow:propose` | `openspec-propose`(或 new+continue) | 四件套 + tasks 结构合理 |
| 3 review | `/devflow:review` | `writing-plans` + 自检 + 可选 cross-review subagent | 用户 lock |
| 4 apply | `/devflow:apply` | `using-git-worktrees`→逐 task:`test-driven-development`+`openspec-apply-change`;≥4 独立→`dispatching-parallel-agents` | 测试绿 + commit |
| 5 audit | `/devflow:audit` | 项目 tooling + `requesting-code-review` | 问题归档或修 |
| 6 archive | `/devflow:archive` | `verification-before-completion`→`finishing-a-development-branch`→`openspec-verify-change`→`openspec-archive-change` | 归档完成 |

## 全局规则

### change_id 统一键
一个 `change_id` 贯穿:git branch(`feature/<id>`)、`openspec/changes/<id>/`、archive 目录名(`openspec/changes/archive/<date>-<id>/`)。三系统(git / openspec / 归档)靠此单键衔接。brainstorm/propose 阶段生成,贯穿全程。

### worktree 隔离
apply 阶段用 `superpowers:using-git-worktrees` 建 worktree 隔离;archive 阶段用 `superpowers:finishing-a-development-branch` 走纯 git ff-merge/rebase 合回。**不自制 worktree 脚本**(规避 easyflow worktree-rebase-ff.sh 的 origin/HEAD 坑)。

### TDD 约定(prose)
tasks.md 每个 task 用 `N.M.1~5` 子任务结构(写测试/跑红/实现/跑绿/重构)+ RED/GREEN 证据。**纯 prose 约定,不靠 lint 强制**;openspec 自带 lint 就用,没有就自觉。

### apply 条件式派发
默认 **inline**(主代理逐 task 用 TDD + openspec-apply-change)。仅当判 `≥4 个无依赖 task` 时用 `dispatching-parallel-agents` 并行,可选 `executing-plans` 或 `subagent-driven-development` 当驱动器。判定:读 tasks.md,标出无依赖的 task 组,≥4 才并行;否则 inline。

### [devflow] 状态行
每阶段结束打一行 `[devflow] <phase> 完成 → 下一阶段:<next>`。轻量可见性,纯约定。

## 每阶段 checklist

### 1 brainstorm
- **入口**:用户提了想法/需求;未进 openspec change
- **调用**:`skill("brainstorming")`;想深一层加 `skill("openspec-explore")`
- **出口**:设计方向明确;用户认可;pre-design notes 在手(对话或 scratch 文件)
- **下一阶段**:`/devflow:propose`

### 2 propose
- **入口**:brainstorm 出口满足
- **调用**:`skill("openspec-propose")`(一步出四件套);或 `skill("openspec-new-change")` + `skill("openspec-continue-change")`(逐步)
- **出口**:`openspec/changes/<id>/` 有 proposal.md + design.md + specs/ + tasks.md;tasks.md 有 N.M.1~5 TDD 子任务结构
- **下一阶段**:`/devflow:review`

### 3 review
- **入口**:propose 出口满足
- **调用**:`skill("writing-plans")`(refine tasks);自检 checklist(架构/数据流/边界/测试覆盖/性能 五问);可选 cross-review subagent(`task` 工具 general,读 proposal+tasks+design 找漏洞)
- **出口**:review notes 落盘(`openspec/changes/<id>/review.md`);tasks.md 按评审修订;用户说 lock
- **下一阶段**:`/devflow:apply`

### 4 apply
- **入口**:review 出口满足(已 lock)
- **调用**:`skill("using-git-worktrees")` 建 worktree;逐 task:`skill("test-driven-development")` + `skill("openspec-apply-change")`;若 ≥4 无依赖 task:`skill("dispatching-parallel-agents")`(+ 可选 `skill("executing-plans")` 或 `skill("subagent-driven-development")`)
- **出口**:tasks.md 全 [x];测试绿;已 commit
- **下一阶段**:`/devflow:audit`

### 5 audit
- **入口**:apply 出口满足
- **调用**:跑项目自带 tooling(`npm test` / lint / coverage);`skill("requesting-code-review")`;自检 checklist(impl 是否匹配 spec?边界?测试覆盖需求?性能?)
- **出口**:audit notes;问题开 follow-up change 或修 inline;无 P0/P1 遗留
- **下一阶段**:`/devflow:archive`

### 6 archive
- **入口**:audit 出口满足
- **调用**:`skill("verification-before-completion")` → `skill("finishing-a-development-branch")`(ff-merge/rebase + worktree 清理)→ `skill("openspec-verify-change")` → `skill("openspec-archive-change")`(内含 sync-specs,把 delta spec 合进 `openspec/specs/`)
- **出口**:master clean;`openspec/changes/archive/<date>-<id>/`;`openspec/specs/<capability>/spec.md` 已同步;worktree 已删
- **下一阶段**:(完结)

## 相对 easyflow 的取舍
**砍**:bash hooks ×12 / scorers ×5 + metrics / policies 子文件 / hard-stops(H8/H10/H13)/ agent-selector / install tooling / .harness 运行时态 / tasks-lint.sh
**保留**:6 阶段形状 / skill map / 入口出口 checklist / change_id 统一键 / worktree 隔离(用原生)/ TDD 纪律(prose)

详见 `docs/devflow-design.md` §5。

## 命令清单
- `/devflow:brainstorm` — 探索意图、定方向
- `/devflow:propose` — 生成 OpenSpec 四件套
- `/devflow:review` — 工程评审、锁定计划
- `/devflow:apply` — worktree 隔离 + 逐 task TDD 实施
- `/devflow:audit` — 代码质量 + 测试覆盖审计
- `/devflow:archive` — 终验 + 合回 + 归档
