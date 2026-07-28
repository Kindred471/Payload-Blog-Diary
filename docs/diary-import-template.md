# 日记批量导入模板

每篇日记保存为一个 UTF-8 编码的 `.md` 文件。复制本文件并填写内容；文件名可使用 `YYYY-MM-DD.md`，但实际数据以 front matter 为准。

```md
---
title: 2026 年 7 月 28 日
entryDate: 2026-07-28
tags:
  - 工作
  - 阅读
mood: calm
weather: 晴，28 C
location: 上海
---

今天完成了日记功能的需求梳理。

这段文字支持 **加粗**、*斜体*、[链接](https://example.com) 和普通段落。
```

规则：

- `title` 和 `entryDate` 必填；正文不能为空。
- `entryDate` 必须是 `YYYY-MM-DD`，且每个日期只能有一篇日记。
- `tags` 是可选的字符串列表；重复标签会被拒绝。
- `mood` 可省略；填写时只能是：`happy`、`calm`、`tired`、`anxious`、`sad`、`angry`。Payload Admin 分别显示为“开心、平静、疲惫、焦虑、难过、愤怒”。
- `weather` 和 `location` 可省略，填写为简短文本。
- 未列出的 front matter 字段会被拒绝，避免导入时静默丢失数据。
