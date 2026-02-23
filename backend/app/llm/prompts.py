"""Prompt templates for article summarization and digest generation."""

# ---------------------------------------------------------------------------
# Article summary prompt
# ---------------------------------------------------------------------------
# Expected placeholders: {title}, {content}
ARTICLE_SUMMARY_PROMPT = (
    "Summarize the following article in Chinese. Provide:\n"
    "1) A concise summary (2-3 sentences)\n"
    "2) 3-5 key points as bullet points\n\n"
    "Article title: {title}\n\n"
    "Article content:\n{content}"
)

# ---------------------------------------------------------------------------
# Digest report prompt
# ---------------------------------------------------------------------------
# Expected placeholders: {period}, {start}, {end}, {summaries}
DIGEST_PROMPT = (
    "Based on the following article summaries from {period} ({start} to {end}), "
    "create a comprehensive digest report in Chinese Markdown format. "
    "Group by topic/theme. Include:\n"
    "1) Executive summary\n"
    "2) Key trends\n"
    "3) Detailed per-topic breakdown\n"
    "4) Notable highlights\n\n"
    "Article summaries:\n{summaries}"
)
