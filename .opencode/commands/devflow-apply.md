---
description: devflow 阶段 4 — worktree 隔离 + 逐 task TDD 实施
---

# /devflow:apply

本阶段:隔离 worktree,逐 task 用 TDD 实施,测试绿后 commit。

## 调用 skill
1. `skill("using-git-worktrees")` — 建 worktree 隔离(不自制脚本)
2. 逐 task:`skill("test-driven-development")` + `skill("openspec-apply-change")`
3. **条件**:若 ≥4 个无依赖 task → `skill("dispatching-parallel-agents")` 并行(+ 可选 `skill("executing-plans")` 或 `skill("subagent-driven-development")` 当驱动器)

## 入口 checklist
- [ ] review 出口满足(已 lock)
- [ ] worktree 已建(或确认在主仓 inline)

## 出口 checklist
- [ ] tasks.md 全 [x]
- [ ] 测试绿(项目 tooling 跑过)
- [ ] 已 commit
- [ ] 打 `[devflow] apply 完成 → 下一阶段:audit`

## 下一阶段
完成且出口满足 → `/devflow:audit`

> 详细规则见 `docs/devflow-rules.md` §apply。真相源在 docs/devflow-rules.md(opencode.json 自动加载)。
