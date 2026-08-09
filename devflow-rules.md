# devflow 规则(自动加载)

> 本文件是 devflow 的**真相源**:6 阶段 workflow + 全局规则 + 每阶段 checklist。通过 `opencode.json` 的 `instructions` 字段自动注入 context(与 AGENTS.md 合并)。`/init` 不碰本文件(只改 AGENTS.md 瘦桩)。
>
> 设计文档见 `docs/devflow-design.md`;瘦桩见 `AGENTS.md`。

## 前置依赖
- **opencode + superpowers 插件**(全局,marketplace 装)——提供 7 核心 + 4 条件 superpowers skill
- **openspec CLI**(`@fission-ai/openspec` 或 `@studyzy/openspec-cn`,Node ≥20.19)——archive 阶段用
- **openspec skills 已 vendor**——本模板 `.opencode/skills/openspec-*/` 自带 8 个,无需再 init

## 规模判定(代理自判)

> 决定走 `fast-track`(一条龙串接,4 步)还是 `full`(逐阶段,6 步)。入口唯一 `/devflow:brainstorm`,代理读完用户初始请求即判。

**自判流程**:
1. 代理读用户初始请求 → 按启发式判 route
2. 打 `[devflow] 判定 <route> 理由:...`(用户可一句话覆盖)
3. **fast-track**:同一会话一条龙串接 propose→apply→archive,中途不停,跳 review/audit;用户可随时打断
4. **full**:brainstorm 出口停,逐阶段等用户敲下一命令(现有 6 步 UX)
5. **复判升级**:propose 写完 tasks.md 后按实际 task 数复判;超阈值则 `[devflow] 升级 full`,跳出串接,补 review/audit

**启发式**(代理可从请求文本判):
- 单文件 / 单 capability → fast-track
- 预估 ≤5 task → fast-track
- 无跨切面(auth / 数据迁移 / 多模块 API 契约变更)→ fast-track
- 任一反例 → full
- 边界模糊 → 默认 fast-track(可升级,省得过度)

## 6 阶段总览

| 阶段 | 命令 | full(逐阶段) | fast-track(自判+串接) |
|---|---|---|---|
| 1 brainstorm | `/devflow:brainstorm` | `brainstorming`(+`openspec-explore`可选);pre-design 落盘 | 同 left 但 pre-design **留对话不落盘**;**入口自判 route** |
| 2 propose | `/devflow:propose` | `openspec-propose` 四件套 | spec + tasks,design.md 走 openspec 条件**跳过**;**复判升级点** |
| 3 review | `/devflow:review` | `writing-plans` + 自检 + 可选 cross-review subagent | **跳过**(自检并进 apply) |
| 4 apply | `/devflow:apply` | worktree + per-task `N.M.1~5`;≥4 独立→`dispatching-parallel-agents` | **inline**(无 worktree)+ **模块级 TDD** |
| 5 audit | `/devflow:audit` | 项目 tooling + 可选 `requesting-code-review` subagent | **跳过**(自检并进 archive) |
| 6 archive | `/devflow:archive` | 全 4 skill:`verification-before-completion`→`finishing-a-development-branch`→`openspec-verify-change`→`openspec-archive-change` | `verification-before-completion`→`finishing-a-development-branch`→`openspec-archive-change`(**跳 `openspec-verify-change`**) |

## 全局规则

### change_id 统一键
一个 `change_id` 贯穿:git branch(`feature/<id>`)、`openspec/changes/<id>/`、archive 目录名(`openspec/changes/archive/<date>-<id>/`)。三系统(git / openspec / 归档)靠此单键衔接。brainstorm/propose 阶段生成,贯穿全程。

### worktree 隔离
apply 阶段用 `superpowers:using-git-worktrees` 建 worktree 隔离;archive 阶段用 `superpowers:finishing-a-development-branch` 走纯 git ff-merge/rebase 合回。**不自制 worktree 脚本**(规避 easyflow worktree-rebase-ff.sh 的 origin/HEAD 坑)。**fast-track**:不用 worktree,inline 在主仓 feature 分支直接做。

### TDD 约定(prose)
- **full**:tasks.md 每个 task 用 `N.M.1~5` 子任务结构(写测试/跑红/实现/跑绿/重构)+ RED/GREEN 证据。
- **fast-track**:模块级 TDD——一模块写全部测试 → RED → 实现 → GREEN(不强求逐 task RED/GREEN)。
- 纯 prose 约定,不靠 lint 强制;openspec 自带 lint 就用,没有就自觉。

### apply 条件式派发
默认 **inline**(主代理逐 task 用 TDD + openspec-apply-change)。仅当判 `≥4 个无依赖 task` 时用 `dispatching-parallel-agents` 并行,可选 `executing-plans` 或 `subagent-driven-development` 当驱动器。判定:读 tasks.md,标出无依赖的 task 组,≥4 才并行;否则 inline。

### 不回写(point-in-time 快照)
brainstorm pre-design 与 proposal/design 是 **point-in-time 快照**;review/apply 阶段的修正只改 `tasks.md` + spec delta,**不回写上游文档**。pre-design 默认留对话,不落盘(`full` 且用户要求时才落盘)。

### subagent 评审范围
- **fast-track**:禁用 cross-review / code-review subagent(主代理自检即可)。
- **full**:保持"可选"(现状措辞不变)。

### [devflow] 状态行
每阶段结束打一行 `[devflow] <phase> 完成 → 下一阶段:<next>`。规模判定与升级也打行:`[devflow] 判定 <route> 理由:...`、`[devflow] 升级 full,理由:...`。轻量可见性,纯约定。

## 每阶段 checklist

### 1 brainstorm
- **入口**:用户提了想法/需求;未进 openspec change
- **调用**:`skill("brainstorming")`;想深一层加 `skill("openspec-explore")`
- **自判**:读完请求按 §规模判定 启发式判 route,打 `[devflow] 判定 ...`;用户可覆盖
- **出口**:设计方向明确;用户认可;pre-design notes 在手
- **fast-track**:pre-design 留对话不落盘;判定 fast-track 后**一条龙串接** propose→apply→archive
- **full**:pre-design 可落盘;出口停,等 `/devflow:propose`
- **下一阶段**:`/devflow:propose`

### 2 propose
- **入口**:brainstorm 出口满足
- **调用**:`skill("openspec-propose")`(一步出四件套);或 `skill("openspec-new-change")` + `skill("openspec-continue-change")`(逐步)
- **出口**:`openspec/changes/<id>/` 有 proposal.md + design.md + specs/ + tasks.md(full)/ proposal.md + specs/ + tasks.md(fast-track,design 跳过);tasks.md 有 TDD 子任务结构
- **fast-track**:design.md 走 openspec 条件跳过(仅 spec + tasks + proposal);写完 tasks.md **复判**,超阈值则 `[devflow] 升级 full` 跳出串接
- **下一阶段**:`/devflow:review`(full)/ 直接 apply(fast-track)

### 3 review
- **入口**:propose 出口满足
- **调用**:`skill("writing-plans")`(refine tasks);自检 checklist(架构/数据流/边界/测试覆盖/性能 五问);可选 cross-review subagent(`task` 工具 general,读 proposal+tasks+design 找漏洞)
- **出口**:review notes 落盘(`openspec/changes/<id>/review.md`);tasks.md 按评审修订;用户说 lock
- **fast-track**:**跳过本阶段**(自检并进 apply)
- **下一阶段**:`/devflow:apply`

### 4 apply
- **入口**:review 出口满足(已 lock)
- **调用**:`skill("using-git-worktrees")` 建 worktree;逐 task:`skill("test-driven-development")` + `skill("openspec-apply-change")`;若 ≥4 无依赖 task:`skill("dispatching-parallel-agents")`(+ 可选 `skill("executing-plans")` 或 `skill("subagent-driven-development")`)
- **出口**:tasks.md 全 [x];测试绿;已 commit
- **fast-track**:**inline**(无 worktree,主仓 feature 分支直接做)+ **模块级 TDD**(一模块写全测→RED→实现→GREEN);apply 前做 review 的五问自检
- **下一阶段**:`/devflow:audit`(full)/ 直接 archive(fast-track)

### 5 audit
- **入口**:apply 出口满足
- **调用**:跑项目自带 tooling(`npm test` / lint / coverage);`skill("requesting-code-review")`;自检 checklist(impl 是否匹配 spec?边界?测试覆盖需求?性能?)
- **出口**:audit notes;问题开 follow-up change 或修 inline;无 P0/P1 遗留
- **fast-track**:**跳过本阶段**(测试绿即可;自检并进 archive 的 verification)
- **下一阶段**:`/devflow:archive`

### 6 archive
- **入口**:audit 出口满足(full)/ apply 出口满足(fast-track)
- **调用**:`skill("verification-before-completion")` → `skill("finishing-a-development-branch")`(ff-merge/rebase + worktree 清理)→ `skill("openspec-verify-change")` → `skill("openspec-archive-change")`(内含 sync-specs,把 delta spec 合进 `openspec/specs/`)
- **出口**:master clean;`openspec/changes/archive/<date>-<id>/`;`openspec/specs/<capability>/spec.md` 已同步;worktree 已删
- **fast-track**:跑 `verification-before-completion` → `finishing-a-development-branch`(inline 无 worktree 时只做合回)→ `openspec-archive-change`;**跳 `openspec-verify-change`**(audit 已跳过,verify 冗余)
- **下一阶段**:(完结)

## 相对 easyflow 的取舍
**砍**:bash hooks ×12 / scorers ×5 + metrics / policies 子文件 / hard-stops(H8/H10/H13)/ agent-selector / install tooling / .harness 运行时态 / tasks-lint.sh / **per-task TDD(fast-track 改模块级)** / **subagent 评审(fast-track 禁用)** / **回写上游文档(改不回写)**
**保留**:6 阶段形状 / skill map / 入口出口 checklist / change_id 统一键 / worktree 隔离(用原生)/ TDD 纪律(prose)/ **代理自判分级(fast-track / full)** / **一条龙串接(fast-track)**

详见 `docs/devflow-design.md` §5。

## 命令清单
- `/devflow:brainstorm` — 探索意图、定方向、**自判 route**(入口唯一)
- `/devflow:propose` — 生成 OpenSpec 四件套(fast-track:spec+tasks)
- `/devflow:review` — 工程评审、锁定计划(fast-track:跳过)
- `/devflow:apply` — worktree 隔离 + 逐 task TDD 实施(fast-track:inline + 模块级)
- `/devflow:audit` — 代码质量 + 测试覆盖审计(fast-track:跳过)
- `/devflow:archive` — 终验 + 合回 + 归档(fast-track:跳 verify-change)
