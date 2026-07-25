---
description: "Tóm tắt nội dung từ URL, YouTube video, hoặc file local."
skills: [summarize]
---

# /summarize

> **Mục tiêu**: Tóm tắt/trích xuất nội dung từ bất kỳ nguồn nào
> **Skills**: summarize (CLI tool)
> **Trigger**: "tóm tắt", "summarize", "video này nói gì", "transcribe"

## Bước 1: Detect source type

| User input | Type | Tool call |
|-----------|------|-----------|
| URL (http/https) | `url` | `summarize "<URL>"` |
| YouTube link | `youtube` | `summarize "<URL>" --transcript` |
| File path | `file` | `summarize "<path>"` |

## Bước 2: Run summarize CLI

```
# Default (medium length, Gemini Flash)
summarize "<source>" --length medium

# Short summary
summarize "<source>" --length short

# YouTube transcript only
summarize "<URL>" --transcript

# If site blocks scraping
summarize "<URL>" --firecrawl always
```

**Model**: Default `google/gemini-3-flash-preview`. Switch to stronger model only if user requests deeper analysis.

## Bước 3: Present results

1. Show summary with key takeaways highlighted
2. If YouTube: include timestamps for key sections
3. If article: include source credibility note
4. Ask user if they want to save to Obsidian KB (`/obsidian-kb-save`)

## Quality Gate
- [ ] Summary captures main points (not just intro)
- [ ] Key data points preserved (numbers, names, dates)
- [ ] Source URL/path included in output
