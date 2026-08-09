# devflow 规则

> 6 阶段 workflow + 全局规则 + 规模判定。每阶段入口/出口 checklist 见 `.opencode/commands/devflow-*.md`(按需注入);设计取舍见 `docs/devflow-design.md`。

## 前置依赖
- openspec CLI(`@fission-ai/openspec` 或 `@studyzy/openspec-cn`,Node ≥20.19)+ superpowers 全局插件(marketplace)
- skills 不在仓库:`install.mjs` 跑 `openspec init` + 从全局 superpowers 复制 11 个(install 时现取)

## 规模判定(入口 `/devflow:brainstorm`,代理自判)

读完用户请求即判 fast-track / full,打 `[devflow] 判定 <route> 理由:...`(用户可覆盖)。
- **fast-track**:一条龙串接 propose→apply→archive(跳 review/audit),pre-design 留对话不落盘
- **full**:逐阶段,每阶段出口停
- **复判升级**:propose 写完 tasks.md 按实际 task 数复判,超阈值则 `[devflow] 升级 full` 跳出串接

**启发式**:单文件 / 单 capability / 预估 ≤5 task / 无跨切面(auth/迁移/多模块 API)→ fast-track;任一反例 → full;模糊 → 默认 fast-track

## 6 阶段总览

| 阶段 | 命令 | full | fast-track |
|---|---|---|---|
| 1 brainstorm | `/devflow:brainstorm` | `brainstorming`;pre-design 落盘 | pre-design 留对话;**入口自判 route** |
| 2 propose | `/devflow:propose` | `openspec-propose` 四件套 | spec+tasks,design 跳过;**复判升级点** |
| 3 review | `/devflow:review` | `writing-plans`+自检+可选 subagent | **跳过** |
| 4 apply | `/devflow:apply` | worktree+per-task `N.M.1~5`;≥4 独立→`dispatching-parallel-agents` | **inline**+**模块级 TDD** |
| 5 audit | `/devflow:audit` | tooling+可选 `requesting-code-review` | **跳过** |
| 6 archive | `/devflow:archive` | `verification-before-completion`→`finishing-a-development-branch`→`openspec-verify-change`→`openspec-archive-change` | 跳 `openspec-verify-change`,余同 full |

> fast-track 跳 review,但 apply 前做五问自检(架构/数据流/边界/测试/性能)代 review;跳 audit,由 archive 的 verification 兜底。

## 出口(阶段边界)
- brainstorm:方向认可 + pre-design 在手
- propose:四件套齐(full)/ spec+tasks(fast-track)
- review:tasks 修订 + 用户 lock
- apply:tasks 全 [x] + 测试绿 + commit
- audit:无 P0/P1 遗留
- archive:change 归档 + specs 同步

## 全局规则

### change_id 统一键
一个 `change_id` 贯穿 git branch(`feature/<id>`)、`openspec/changes/<id>/`、archive 目录名。

### worktree
full:`using-git-worktrees` 隔离 + `finishing-a-development-branch` 合回;fast-track:inline 主仓 feature 分支,不用 worktree。

### TDD
full:per-task `N.M.1~5`(写测/跑红/实现/跑绿/重构)+ RED/GREEN 证据;fast-track:模块级(一模块写全测→RED→实现→GREEN)。

### apply 条件式派发
默认 inline;仅 ≥4 个无依赖 task 才 `dispatching-parallel-agents` 并行。

### 不回写
pre-design / proposal / design 是 point-in-time 快照;review/apply 修正只改 `tasks.md` + spec delta,不回写上游。

### subagent 评审
fast-track:禁用;full:可选。

### [devflow] 状态行
每阶段结束打 `[devflow] <phase> 完成 → <next>`;判定/升级也打行。
