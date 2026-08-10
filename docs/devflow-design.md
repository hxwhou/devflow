# devflow 设计文档

> 纯文档编排 openspec + superpowers 的 6 阶段编程框架。本文记录从 easyflow 分析到 devflow 成型的完整选型、思路与结构,供他人理解整个过程。

## 1. 背景与动机

**起点**:对 easy-flow 框架做了完整分析(见 easyflow-test 仓 `development-framework-overview.md`),结论是其**实现层过重**:
- bash hooks 12 个(session-start / design-init / design-finalize / worktree-create / worktree-rebase-ff / harness-sync / ship-cleanup / tasks-lint / constitution-validity / workflow-entry / ...)
- scorers 5 个 + metrics.json
- policies markdown 子文件(reframe / premise / response-posture 等)
- hard-stops.md(H8 状态行 / H10 agent-selector / H13 禁用 superpowers 两个 driver)
- agent-selector 选 agent
- install tooling(sources.js / eflow-lock / npm 包)
- 运行时态 .harness/

**目标**:不重新实现这些机制,直接用 openspec + superpowers 的现成 skill 编排一个更简的框架,自己掌控 workflow。

## 2. 选型过程(决策链)

按时间顺序的分叉与选择:

| # | 分叉 | 选项 | 选择 | 理由 |
|---|---|---|---|---|
| 1 | 框架形态 | 纯文档约定 / 个人配置 / 可分发插件 | **纯文档约定 + install.mjs** | 运行时最简、单点维护;一个跨平台 Node 脚本把框架装进已有项目(零新依赖,Node 本就是 openspec CLI 前置) |
| 2 | 阶段数 | 3 / 4 / 6 | **6**(brainstorm→propose→review→apply→audit→archive) | 沿用 easyflow 验证过的形状,但每阶段直接调原生 skill |
| 3 | apply 执行 | inline / superpowers 原生 subagent / 条件式 | **条件式** | 默认 inline 保控制力;≥4 无依赖 task 才并行 |
| 4 | 文档结构 | 单 AGENTS.md / AGENTS.md+命令 / 单 skill | **AGENTS.md + 6 个 /devflow 命令薄壳** | AGENTS.md 是单一真相源,命令只按需注入该阶段指南;ergonomic + 仍 100% markdown |
| 5 | 创建位置 | 新仓库 / 就地 easyflow-test | **新仓库 D:\09-opencode\devflow** | 干净独立,不污染分析仓 |
| 6 | openspec skills 来源 | vendor / 跑 openspec init | **跑 openspec init** | install 时 `openspec init --tools opencode` 现取(canonical、最新),后删 `/opsx-*` 命令只要 skills;除 3 个补 skill(verify/new/continue-change,init 不生成)vendor 外,仓库不携带副本 |
| 7 | vendor 范围 | 全部 vendor / 仅补 init 缺的 | **仅 3 个(verify/new/continue-change)** | init 产 6 个常用 openspec skill(propose/apply-change/archive-change/explore/sync-specs/update-change);唯独这 3 init 不生成,仓库 vendor 补拷(见 §4.3) |
| 8 | /init 防护 | 现状靠 git / 重构 opencode.json instructions | **重构** | /init 对已存在 AGENTS.md 是 merge(不毁但污染);rules 挪出 AGENTS.md + 用官方 instructions 自动加载(见 §3.8) |

## 3. 实现思路与逻辑(关键决策)

### 3.1 audit 不用 scorer 脚本
- **决策**:audit 阶段跑目标项目自身 tooling(`npm test` / lint / coverage)+ `requesting-code-review` + prose checklist。
- **逻辑**:纯文档跑不了 bash scorer;覆盖率/代码质量靠项目已有工具 + code-review skill,框架不自带。
- **对比 easyflow**:砍掉 5 个 scorers/*.sh + metrics.json + audit/SKILL.md 的 scorer 调度逻辑。

### 3.2 review 不用 config/challenger
- **决策**:review = `writing-plans`(refine tasks)+ 自检 checklist(架构/数据流/边界/测试覆盖/性能 五问)+ 可选一次性 cross-review subagent(`task` 工具 general,读 proposal+tasks+design 找漏洞)。
- **逻辑**:避免 easyflow 的 config.yaml(challenger.enabled/model/prompt_mode)复杂度;cross-review 用通用 subagent 一次跑完,不常驻。
- **对比 easyflow**:砍掉 plan-review/config.yaml + challenger 机制。

### 3.3 apply 条件式派发
- **决策**:默认 inline(主代理逐 task 用 TDD + openspec-apply-change);判定 `≥4 个无依赖 task` 才用 `dispatching-parallel-agents` 并行,可选 `executing-plans` 或 `subagent-driven-development` 当驱动器。
- **逻辑**:小变更不值得派发开销;大变更并行才划算。判定规则写进 AGENTS.md prose。
- **对比 easyflow**:easyflow H13 **禁用** superpowers 两个 driver、自写 agent-selector;devflow 反其道——直接用 superpowers 原生路径,砍掉 agent-selector。

### 3.4 worktree 用 superpowers 原生
- **决策**:apply 隔离用 `using-git-worktrees`;archive 合回用 `finishing-a-development-branch` 走纯 git ff-merge/rebase。
- **逻辑**:不自制 worktree-create.sh / worktree-rebase-ff.sh。easyflow 的 worktree-rebase-ff.sh 硬依赖 `origin/HEAD`(remote),无 remote 项目必败(exit 3);用原生 skill + 纯 git 命令规避此坑。
- **对比 easyflow**:砍掉 worktree-create.sh / worktree-rebase-ff.sh / harness-sync.sh / ship-cleanup.sh。

### 3.5 change_id 统一键
- **决策**:`change_id` 贯穿 git branch(`feature/<id>`)、`openspec/changes/<id>/`、archive 目录名。
- **逻辑**:三系统(git / openspec / 归档)靠此单键衔接。沿用 easyflow 验证过的设计。
- **简化**:运行时态 `.harness/` 非必需,checkpoint 直接写进 `openspec/changes/<id>/` 或留对话。

### 3.6 TDD 纯 prose 约定
- **决策**:tasks.md 用 `N.M.1~5` 子任务结构(写测试/跑红/实现/跑绿/重构)+ RED/GREEN 证据;作为 prose 约定,**不靠 tasks-lint.sh 强制**。
- **逻辑**:保留 TDD 纪律,但去掉机械 lint。openspec 自带 lint 就用,没有就自觉。
- **对比 easyflow**:砍掉 tasks-lint.sh(6 条规则机械检查)。

### 3.7 [devflow] 状态行
- **决策**:每阶段结束打 `[devflow] ...` 状态行。
- **逻辑**:轻量可见性,替代 easyflow H8。纯约定,无 hook 强制。

### 3.8 防 /init 污染(AGENTS.md 瘦桩 + opencode.json instructions)
- **决策**:框架真内容放 `devflow-rules.md`;`AGENTS.md` 只留瘦桩;`opencode.json` 的 `instructions` 字段把 rules 文件自动注入 context(与 AGENTS.md 合并)。
- **逻辑**:opencode `/init` 对已存在的 AGENTS.md 是"原地改进"(merge),不毁但会塞入其代码分析污染真相源。rules 文件不在 AGENTS.md 路径,/init 不碰;瘦桩任其改,`git restore AGENTS.md` 即恢复。用 opencode 官方推荐的 `instructions` 机制(见 opencode docs Rules 页)保留 always-on context。
- **drop-in 注入**:`install.mjs` 把瘦桩以 `<!-- devflow:start -->…<!-- devflow:end -->` 标记块注入用户**已有** `AGENTS.md`(有则替换、无则追加,幂等),不碰用户自有内容;`opencode.json` 同理 merge `instructions`(去重),`openspec/config.yaml` 仅当不存在才落。
- **对比 easyflow**:easyflow 的 AGENTS.md 是自写分析仓的、不暴露给 /init;devflow 作为可分发模板必须考虑用户跑 /init 的场景。

## 4. 框架结构

### 4.1 文件布局
```
D:\09-opencode\devflow\
  install.mjs                        # 跨平台安装器:openspec init + 复制 superpowers + devflow 文件
  opencode.json                      # instructions: ["devflow-rules.md"] — 自动加载规则到 context
  AGENTS.md                          # 瘦桩:指路 + /init 防护(/init 只改此桩)
  src/commands/                     # 6 个 /devflow:* 命令薄壳(install 时拷到目标 .opencode/commands/)
    devflow-brainstorm.md            # /devflow:brainstorm
    devflow-propose.md               # /devflow:propose
    devflow-review.md                # /devflow:review
    devflow-apply.md                 # /devflow:apply
    devflow-audit.md                 # /devflow:audit
    devflow-archive.md               # /devflow:archive
  .opencode/skills/                  # 3 vendored openspec 补 skill(verify/new/continue-change;init 不生成)
  .gitignore
  devflow-rules.md              # 真相源:6 阶段 + 全局规则 + checklist(/init 不碰)
  docs/devflow-design.md             # 本设计文档
```
- skills 绝大多数不预置:install 时 `openspec init` 现取 6 个 openspec skill(canonical)+ 从全局 superpowers 复制 12 个;唯独 verify/new/continue-change 这 3 个 init 不生成,devflow 仓库 vendor 补拷

### 4.2 六阶段 skill 映射
| 阶段 | 命令 | 入口 skill | 产出 | 出口 |
|---|---|---|---|---|
| 1 brainstorm | /devflow:brainstorm | `brainstorming`(+`openspec-explore`可选) | 设计意图/pre-design | 用户认可方向 |
| 2 propose | /devflow:propose | `openspec-propose`(或 new+continue) | `openspec/changes/<id>/` 四件套 | tasks 结构合理 |
| 3 review | /devflow:review | `writing-plans` + 自检 + 可选 cross-review subagent | review notes + tasks 修订 | 用户 lock |
| 4 apply | /devflow:apply | `using-git-worktrees`→逐 task:`test-driven-development`+`openspec-apply-change`;≥4 独立→`dispatching-parallel-agents` | 全 [x] + 测试绿 + commit | 测试绿 |
| 5 audit | /devflow:audit | 项目 tooling + `requesting-code-review` + checklist | audit notes | 问题归档或修 |
| 6 archive | /devflow:archive | `verification-before-completion`→`finishing-a-development-branch`→`openspec-verify-change`→`openspec-archive-change`(内含 sync-specs) | master clean + 归档 + specs 同步 | 归档完成 |

### 4.3 openspec skill 清单(devflow 用 9 个:vendored 3 + init 6)
| skill | 阶段 | 来源 | 角色 |
|---|---|---|---|
| openspec-propose | P2 | init | 核心 |
| openspec-apply-change | P4 | init | 核心 |
| openspec-archive-change | P6 | init | 核心(内含 sync-specs) |
| openspec-explore | P1 | init | 可选 |
| openspec-sync-specs | P6 | init | archive 的传递依赖 |
| openspec-update-change | — | init | init 携带,devflow 不引用(无害冗余) |
| openspec-verify-change | P6 | **vendor** | 核心(archive full) |
| openspec-new-change | P2 | **vendor** | 备选(propose 逐步) |
| openspec-continue-change | P2 | **vendor** | 备选(propose 逐步) |

> init 产 6 个常用 skill(canonical,随 CLI 版本演进);唯独 verify/new/continue-change 这 3 init 默认不生成,devflow 仓库 vendor 补拷(1.8.0 canonical 内容,升 CLI 大版本时需重拷对齐)。openspec 其余 skill(ff-change / bulk-archive-change / onboard)devflow 不用,init 也不产。

### 4.4 AGENTS.md(瘦桩)+ devflow-rules.md(真相源)
- **AGENTS.md 瘦桩**:一句话定位 + 指路(`/devflow:brainstorm` 开始)+ rules 已自动加载的说明 + /init 防护提醒
- **devflow-rules.md 真相源**(opencode.json `instructions` 自动加载):
  - 定位(一句话)
  - 前置依赖(opencode + superpowers 全局;openspec CLI;skills install 时现取;plugin-less 运行时)
  - 规模判定(fast-track / full 启发式 + 复判升级)
  - 6 阶段总览表(skill + full / fast-track 列)
  - 出口(阶段边界,每阶段一行)
  - 全局规则(change_id 统一键 / worktree / TDD prose / apply 条件式判定 / 不回写 / subagent 评审 / [devflow] 状态行)
  - 每阶段入口/出口 checklist 见 `.opencode/commands/devflow-*.md`(按需注入,不在 rules.md 内);取舍说明见本文 §5;命令清单见 README
- **opencode.json**:`{ "$schema": "...", "instructions": ["devflow-rules.md"] }`

### 4.5 命令薄壳模板
```
---
description: "<阶段一句话>"
---
# /devflow:<phase>
本阶段:<目标>
## 调用 skill   ← 显式 skill 名 + 顺序
## 入口 checklist
## 出口 checklist
## 下一阶段 → /devflow:<next>
```
真相源在 devflow-rules.md(opencode.json 自动加载),命令只按需注入该阶段指南。

## 5. 相对 easyflow 的取舍

### 砍掉(及为何)
| 砍 | 为何 |
|---|---|
| bash hooks ×12 | 纯文档跑不了;改 prose 约定或依赖 skill 自带 |
| scorers ×5 + metrics | audit 改用项目 tooling + code-review skill |
| policies 子文件 | 直接用 brainstorming 自带 |
| hard-stops(H8/H10/H13) | 不需要;直接用 superpowers 原生 subagent 路径 |
| agent-selector | apply 条件式自决 |
| install tooling | install.mjs(Node,跨平台,零依赖);或 git clone 当模板 |
| .harness 运行时态 | checkpoint 进 openspec change 目录 |
| tasks-lint.sh | TDD 改 prose 约定 |
| per-task TDD(fast-track) | fast-track 改模块级 TDD(一模块全测→RED→实现→GREEN),省 ~70 工具往返 |
| subagent 评审(fast-track) | fast-track 禁用 cross-review / code-review subagent,主代理自检即可 |
| 回写上游文档 | 改 point-in-time:修正只动 tasks.md + spec delta,不回写 pre-design/proposal/design |

### 保留(及为何)
| 保留 | 为何 |
|---|---|
| 6 阶段形状 | easyflow 验证过,粒度合适 |
| skill map | 核心价值——明确每阶段调哪个 skill |
| 入口/出口 checklist | 阶段边界清晰 |
| change_id 统一键 | 三系统衔接 |
| worktree 隔离 | 用 superpowers 原生,不自制脚本 |
| TDD 纪律 | prose 约定,去掉机械 lint |
| 代理自判分级(fast-track / full) | 入口读请求即判 route,小改动一条龙串接省时 |
| 一条龙串接(fast-track) | fast-track 同会话串 propose→apply→archive,中途不停 |

## 6. 前置依赖
- opencode + superpowers 插件(全局,marketplace 装)——install 时作 superpowers skills 复制源
- openspec CLI(`@fission-ai/openspec` 或 `@studyzy/openspec-cn`,Node ≥20.19)——`openspec init` 生成 openspec skills + archive 用

## 7. 实施步骤
1. 建仓 `D:\09-opencode\devflow\` + `git init`
2. 写 `.gitignore`(`.harness/`、`node_modules/`、`*.log`、`.DS_Store`、`Thumbs.db`、`*.tmp`)
3. Vendor 8 个 openspec skill(从 `easyflow-demo/.opencode/skills/openspec-*/` 拷净,已验零 easyflow 耦合)
4. 写 `openspec/config.yaml`(最小配置)
5. 写 `AGENTS.md`(瘦桩)+ `opencode.json`(instructions)+ `devflow-rules.md`(真相源)
6. 写 6 个命令薄壳 `src/commands/devflow-*.md`
7. `git add -A` + commit `feat: devflow framework — pure-doc orchestration of openspec + superpowers`
8. 验证:tree 列表;抽检 AGENTS.md + 一个命令 frontmatter;(可选)小变更试跑 `/devflow:brainstorm`

## 8. 附录:skill 使用总览

### OpenSpec(install 时 `openspec init` 现取)
- `openspec init --tools opencode` 现取当前 canonical 集(propose / apply-change / archive-change / explore / sync-specs / update-change 等,以实际 CLI 版本为准)
- init 后删 `/opsx-*` 命令(只留 skills;devflow 用 `/devflow:*` 包装,不要 openspec 的直发命令)
- `openspec-verify-change`(archive full)/ `openspec-new-change`、`openspec-continue-change`(propose 备选)——init 默认不生成,devflow 仓库 vendor 这 3 个(1.8.0 canonical 内容)补拷

### Superpowers(install 时从全局复制 12 个)
- **核心 7**:brainstorming / writing-plans / using-git-worktrees / test-driven-development / requesting-code-review / verification-before-completion / finishing-a-development-branch
- **条件/按需 5**:dispatching-parallel-agents / executing-plans / subagent-driven-development(后两者均为 apply 的可选驱动器)/ systematic-debugging(出 bug 时)/ receiving-code-review(收到评审反馈时)
- **不复制**:using-superpowers(bootstrap,由 devflow-rules.md 每阶段 `skill("...")` 编排替代)/ writing-skills(meta,devflow 不引用)

Superpowers 复制 12(核心 7 + 条件 5);OpenSpec 由 init 提供 canonical 集。运行时 plugin-less(尤其 Windows:插件 + `.opencode/skills/` 挂 opencode bootstrap,需禁用插件),靠本地副本 + rules 编排。
