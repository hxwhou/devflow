---
description: devflow 阶段 4 — worktree 隔离 + 逐 task TDD 实施
---

# /devflow:apply

本阶段:隔离 worktree,逐 task 用 TDD 实施,测试绿后 commit。

## 规模判定
- **fast-track**:**inline**(无 worktree,主仓 feature 分支直接做)+ **模块级 TDD**(一模块写全测→RED→实现→GREEN);apply 前做 review 的五问自检(架构/数据流/边界/测试覆盖/性能)
- **full**:worktree + per-task `N.M.1~5`;≥4 无依赖 task 用 `dispatching-parallel-agents`

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

> 详细规则见 `devflow-rules.md` §apply。真相源在 devflow-rules.md(opencode.json 自动加载)。
