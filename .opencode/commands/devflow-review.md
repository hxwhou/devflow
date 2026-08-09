---
description: devflow 阶段 3 — 工程评审、找漏洞、锁定计划
---

# /devflow:review

本阶段:以对抗式视角评审 proposal+tasks,找漏洞、修订、锁定。

## 调用 skill
1. `skill("writing-plans")` — refine tasks(若 tasks 不够细)
2. 自检 checklist(五问):架构 / 数据流 / 边界情况 / 测试覆盖 / 性能
3. 可选 cross-review subagent:`task` 工具 general,读 proposal+tasks+design 找漏洞(一次性)

## 入口 checklist
- [ ] propose 出口满足(四件套齐)

## 出口 checklist
- [ ] review notes 落盘(`openspec/changes/<id>/review.md`)
- [ ] tasks.md 按评审修订(发现的 finding 已修或已登记)
- [ ] 用户说 lock
- [ ] 打 `[devflow] review 完成 → 下一阶段:apply`

## 下一阶段
完成且出口满足 → `/devflow:apply`

> 详细规则见 `docs/devflow-rules.md` §review。真相源在 docs/devflow-rules.md(opencode.json 自动加载)。
