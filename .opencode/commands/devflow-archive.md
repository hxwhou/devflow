---
description: devflow 阶段 6 — 终验 + 合回 + worktree 清理 + OpenSpec 归档
---

# /devflow:archive

本阶段:终验、合回主仓、清理 worktree、归档 openspec change。

## 调用 skill
1. `skill("verification-before-completion")` — 终验证据
2. `skill("finishing-a-development-branch")` — ff-merge/rebase 合回 + worktree 清理(纯 git,不自制脚本)
3. `skill("openspec-verify-change")` — impl 匹配 change
4. `skill("openspec-archive-change")` — 归档(内含 `openspec-sync-specs`,把 delta spec 合进 `openspec/specs/`)

## 入口 checklist
- [ ] audit 出口满足

## 出口 checklist
- [ ] master clean(合回完成)
- [ ] `openspec/changes/archive/<date>-<id>/`(change 已归档)
- [ ] `openspec/specs/<capability>/spec.md` 已同步
- [ ] worktree 已删
- [ ] 打 `[devflow] archive 完成 → 流程完结`

## 下一阶段
(完结)

> 详细规则见 `docs/devflow-rules.md` §archive。真相源在 docs/devflow-rules.md(opencode.json 自动加载)。
