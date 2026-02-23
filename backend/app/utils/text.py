import re


def html_to_text(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html)


def truncate_text(text: str, max_length: int = 4000) -> str:
    return text[:max_length] if len(text) > max_length else text
