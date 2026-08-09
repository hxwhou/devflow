---
description: devflow 阶段 2 — 生成 OpenSpec 四件套(proposal/design/specs/tasks)
---

# /devflow:propose

本阶段:把设计意图变成可实施的 openspec change,产出四件套 + tasks。

## 调用 skill
1. `skill("openspec-propose")` — 核心:一步出 proposal+design+specs+tasks
2. 或 `skill("openspec-new-change")` + `skill("openspec-continue-change")` — 逐步(备选)

## 入口 checklist
- [ ] brainstorm 出口满足(pre-design notes 在手)
- [ ] `change_id` 已定(或本阶段生成)

## 出口 checklist
- [ ] `openspec/changes/<id>/` 有 proposal.md + design.md + specs/ + tasks.md
- [ ] tasks.md 每个 task 有 N.M.1~5 TDD 子任务结构(写测试/跑红/实现/跑绿/重构)
- [ ] 打 `[devflow] propose 完成 → 下一阶段:review`

## 下一阶段
完成且出口满足 → `/devflow:review`

> 详细规则见 `docs/devflow-rules.md` §propose。真相源在 docs/devflow-rules.md(opencode.json 自动加载)。
