# 营销方法论库

收集、拆解营销方法论，每一套都整理成三样东西：

- **笔记**（`README.md`）：结构、脑图、评析
- **Claude skill**（`SKILL.md`）：让 Claude 按这套方法论做诊断和规划
- **自诊断数据**（`diagnosis.json`）：驱动网站上的自诊断问卷
- **错题**（`diagnosis.json` 里的 `pitfalls`）：方法论里提到的错误打法，网站上汇总成[错题集](https://ashlandkrug878-wq.github.io/yingxiao/#/pitfalls)，可以逐条自查

网站：<https://ashlandkrug878-wq.github.io/yingxiao/>

## 已收录

| 方法论 | 结构 | 来源 |
|---|---|---|
| [从白牌到品牌](methodologies/baipai-to-brand/) | 00 准入判断 + 01–06 六步路径 + 阶段时间线 | 抖音 · 好望水前操盘手 |
| [品牌感从哪来](methodologies/brand-proposition/) | 00 前提 + 主张、行动、传播三步 | 抖音 · 程前朋友圈 |
| [小预算滚雪球](methodologies/growth-positioning/) | 00 前提 + 01–07 增长定位路径 | 抖音 · 雅先生品牌短视频0-1增长 |
| [场景化五步法](methodologies/scene-five-steps/) | 场景痛点、承诺、产品、内容、触达五步 | 抖音 · 品牌老枪 |
| [造梦体系](methodologies/dream-system/) | 内容电商四个段位 + 01–07 造梦路径 | 迪安（小红书，链接待补充） |

## 目录结构

```
index.html               网站入口（GitHub Pages）
site/                    网站样式和脚本
methodologies/
  index.json             方法论注册表，网站按这里的顺序列出
  _template/             新方法论模板
  <方法论 id>/
    README.md            笔记：结构、脑图、评析
    SKILL.md             Claude skill
    diagnosis.json       自诊断数据
    transcript.md        逐字稿（注明来源）
    sources.md           原始素材说明
pitfalls/team.json       团队自己的复盘错题
docs/schema.md           diagnosis.json 数据规范
CLAUDE.md                给 Claude 的维护说明
```

## 新增一套方法论

1. 复制 `methodologies/_template/` 为 `methodologies/<id>/`，`id` 用小写英文和连字符。
2. 写 `README.md`、`SKILL.md`，按 [docs/schema.md](docs/schema.md) 写 `diagnosis.json`。
3. 把 `id` 加进 `methodologies/index.json`。
4. 推送到 `main`，网站自动更新。

把素材（视频链接、逐字稿、截图）交给 Claude 时，说一句"按 yingxiao 仓库的规范收录"即可，流程写在 `CLAUDE.md` 里。
