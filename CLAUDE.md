# 维护说明（给 Claude）

这个仓库是营销方法论库，同时是一个 GitHub Pages 静态网站。用户会陆续带来新的方法论素材（视频链接、逐字稿、截图、文章），要求收录。

## 收录一套新方法论

1. **分析**：先在对话里拆解结构、指出可直接用的部分和需要打折扣的部分（时间窗口、品类特殊性、幸存者偏差、数字口径），和用户确认结构后再写文件。
2. **建文件夹**：复制 `methodologies/_template/` 为 `methodologies/<id>/`。
3. **README.md**：来源、一句话、mermaid 脑图、阶段或结构表、评析。
4. **SKILL.md**：frontmatter 的 `name` 与 `id` 一致；默认在对话里给结论，用户明确要求才生成文档。
5. **diagnosis.json**：按 `docs/schema.md`。写完用 `python3 -c "import json;json.load(open('...'))"` 校验；字符串里的引号用中文引号“”，不要用英文双引号。
6. **transcript.md 与 sources.md**：用户同意把逐字稿放进仓库，但必须在开头注明来源链接、"内容版权归原作者所有"，以及语音转写可能有误。截图默认不上传，用户明确要求时再加。`sources.md` 记来源链接和各类素材的保存位置；`diagnosis.json` 的 `source.transcript` 填逐字稿在 GitHub 上的链接。
7. **注册**：把 `id` 加入 `methodologies/index.json`。
8. **检查网站**：本地 `python3 -m http.server` 后用浏览器打开 `/#/m/<id>`，确认概览和诊断结果正常。
9. **同步 skill**：SKILL.md 有改动时，用 propose_skills 把新版本提给用户保存。

## 约定

- 原文的数字和推算的数字要分开标注：（原文）/（推算）。
- 方法论之间有关联时，在 README 的评析里互相链接。
- 网站只读 `methodologies/index.json` 和各文件夹的 `diagnosis.json`，不需要构建步骤。
- 写作用中文，句子完整，少用缩写和箭头。
