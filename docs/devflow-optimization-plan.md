# devflow 流程优化方案

> 记录用:把"实跑 lucky-wheel 全 6 阶段太慢"的复盘结论固化成 devflow 自身的流程优化。本文件是设计记录,执行后并入 `devflow-rules.md` / `docs/devflow-design.md`。
>
> 约束:只改 devflow 自己的文档(rules.md / 命令薄壳 / design.md / AGENTS.md)。**不改** vendored openspec skill、不改 superpowers skill、不改 openspec CLI——它们就是被调用的。

## 1. 诊断(实跑 lucky-wall 的耗时根因)

| # | 根因 | 现状 | 实跑代价 |
|---|---|---|---|
| 1 | 无规模分级 | 任何改动走全 6 阶段 | ~600 行玩具套全流程 |
| 2 | subagent 评审"可选"但被 checklist 暗推 | review/audit 命令都列了 subagent | 2 趟 fresh-context 往返 |
| 3 | TDD 按 task `N.M.1~5`(prose) | rules.md 全局要求 | 23 task × 4 步 ≈ 92 工具往返 |
| 4 | 无"不回写"规则 | 默认把修正同步到所有文档 | k-公式修 3 处、2π 修多处 |
| 5 | brainstorm pre-design 落盘 docs/ | 设计文档单独建文件 | 双重文档(后又被 propose 重写) |

## 2. 方案核心:代理自判 + 一条龙

**二元分级**:`fast-track` / `full`(不要三元,反复杂)。

**入口唯一**:`/devflow:brainstorm`(不另设 `/devflow:fast`)。

**自判流程**:
1. 代理读用户初始请求 → 按启发式判 fast-track / full
2. 打 `[devflow] 判定 <route> 理由:...`(用户可一句话覆盖)
3. **fast-track**:同一会话**一条龙**串接 propose→apply→archive,中途不停,跳 review/audit;用户可随时打断
4. **full**:brainstorm 出口停,逐阶段等用户敲下一命令(现有 6 步 UX 不变)
5. **复判升级**:propose 写完 tasks.md 后按实际 task 数复判;超阈值则 `[devflow] 升级 full`,跳出串接,补 review/audit

**启发式**(代理可从请求文本判):
- 单文件 / 单 capability → fast-track
- 预估 ≤5 task → fast-track
- 无跨切面(auth / 数据迁移 / 多模块 API 契约变更)→ fast-track
- 任一反例 → full
- 边界模糊 → 默认 fast-track(可升级,省得过度)

## 3. fast-track vs full 路由

| 阶段 | fast-track(自判+串接) | full(逐阶段) |
|---|---|---|
| 1 brainstorm | 对话内,pre-design **不落盘** | 落盘(现状) |
| 2 propose | spec + tasks,design.md 走 openspec 条件**跳过** | 四件套(现状) |
| 3 review | **跳过**(自检并进 apply) | 现状,subagent 可选 |
| 4 apply | **inline**(无 worktree)+ **模块级 TDD** | worktree + per-task `N.M.1~5`,subagent 可选 |
| 5 audit | **跳过**(自检并进 archive) | 现状,subagent 可选 |
| 6 archive | verification + finishing-branch + openspec-archive(**跳 openspec-verify-change**) | 全 4 skill(现状) |

## 4. 三条新全局规则(写进 rules.md §全局规则)

1. **不回写**:brainstorm pre-design 与 proposal/design 是 point-in-time 快照;review/apply 的修正只改 `tasks.md` + spec delta,不回写上游文档。pre-design 默认留对话,不落盘。
2. **TDD 粒度**:fast-track → 模块级(一模块写全部测 → RED → 实现 → GREEN);full → per-task `N.M.1~5`(现状)。
3. **subagent 范围**:fast-track 禁用 cross-review / code-review subagent;full 保持"可选"(不改措辞)。

## 5. 不动什么

- vendored openspec skill(`.opencode/skills/openspec-*/`)——上游,不改
- superpowers skill(全局插件)——上游,不改
- `openspec/config.yaml`——TDD 粒度由 rules.md prose 按 size 决定,config 保持注释
- `opencode.json`——`instructions` 字段结构正确,不改

## 6. 文件改动清单(9 个,全 devflow-own)

1. `devflow-rules.md` — 加 §规模判定(自判+复判+串接)+ 双列阶段表 + 每阶段 fast-track 行 + 3 条全局规则
2. `AGENTS.md` 瘦桩 — 加一行指路 §规模判定
3. `.opencode/commands/devflow-brainstorm.md` — 顶部加自判+串接逻辑
4. `.opencode/commands/devflow-propose.md` — 加复判升级点 + fast-track 跳 design
5. `.opencode/commands/devflow-review.md` — 标"fast-track 跳过"
6. `.opencode/commands/devflow-apply.md` — fast-track:inline + 模块级 TDD
7. `.opencode/commands/devflow-audit.md` — 标"fast-track 跳过"
8. `.opencode/commands/devflow-archive.md` — fast-track:跳 openspec-verify-change
9. `docs/devflow-design.md` §5 — 取舍表补:砍 per-task TDD(fast-track)/ 砍 subagent(fast-track)/ 加不回写 / 加自判分级

## 7. 预期省时(按实跑占比估)

模块级 TDD ≈ -70 工具往返 >> subagent 默认关(fast-track) ≈ -2 往返 > 不回写 > artifact 精简(design 跳过) > 自判分级本身(使前面都生效的开关)
