---
description: devflow 阶段 1 — 探索意图、澄清需求、确定设计方向(brainstorming)
---

# /devflow:brainstorm

本阶段:把模糊需求变成清晰的设计意图,产出 pre-design notes。

## 规模判定(入口)
- 读完用户请求按 rules §规模判定 启发式判 fast-track / full
- 打 `[devflow] 判定 <route> 理由:...`(用户可一句话覆盖)
- **fast-track**:pre-design 留对话不落盘;出口后**一条龙串接** propose→apply→archive(跳 review/audit),中途不停
- **full**:pre-design 可落盘;出口停,等 `/devflow:propose`

## 调用 skill
1. `skill("brainstorming")` — 核心:探索意图、reframe、premise-challenge
2. 想深一层可加 `skill("openspec-explore")` — 思考伙伴

## 入口 checklist
- [ ] 用户提了一个想法/需求
- [ ] 还没进 openspec change(`openspec/changes/` 无对应目录)

## 出口 checklist
- [ ] 设计方向明确(一句话能说清要建什么、为何)
- [ ] 用户认可方向
- [ ] pre-design notes 在手(对话记录或 scratch 文件)
- [ ] 打 `[devflow] brainstorm 完成 → 下一阶段:propose`

## 下一阶段
完成且出口满足 → `/devflow:propose`

> 详细规则见 `devflow-rules.md` §brainstorm。真相源在 devflow-rules.md(opencode.json 自动加载),本文件只是按需注入。
