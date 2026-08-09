---
description: devflow 阶段 5 — 代码质量 + 测试覆盖 + 评审审计
---

# /devflow:audit

本阶段:审计实施产出,确认质量达标。

## 调用 skill
1. 跑项目自带 tooling:`npm test` / lint / coverage(非 skill,是项目自身工具)
2. `skill("requesting-code-review")` — code review
3. 自检 checklist:impl 是否匹配 spec?边界?测试覆盖需求?性能?

## 入口 checklist
- [ ] apply 出口满足(全 [x] + 测试绿)

## 出口 checklist
- [ ] audit notes(问题清单)
- [ ] 问题处理:开 follow-up change 或修 inline
- [ ] 无 P0/P1 遗留
- [ ] 打 `[devflow] audit 完成 → 下一阶段:archive`

## 下一阶段
完成且出口满足 → `/devflow:archive`

> 详细规则见 `docs/devflow-rules.md` §audit。真相源在 docs/devflow-rules.md(opencode.json 自动加载)。
