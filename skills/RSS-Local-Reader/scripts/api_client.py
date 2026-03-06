#!/usr/bin/env python3
"""
AI Info API Client CLI

A command-line tool for interacting with the AI Info RSS reader backend.

Usage:
    python api_client.py health
    python api_client.py feeds list
    python api_client.py feeds create --url "https://example.com/feed.xml"
    python api_client.py articles list --unread --start-time "2026-03-01"
    python api_client.py opml export -o subscriptions.opml
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Optional


def get_api_url() -> str:
    """Get the API base URL from environment or default."""
    return os.environ.get("AI_INFO_API_URL", "http://localhost:8000")


def make_request(
    method: str,
    endpoint: str,
    data: Optional[dict] = None,
    params: Optional[dict] = None,
    is_multipart: bool = False,
    file_path: Optional[str] = None,
) -> Any:
    """Make an HTTP request to the API."""
    base_url = get_api_url()
    url = f"{base_url}{endpoint}"

    if params:
        filtered_params = {k: v for k, v in params.items() if v is not None}
        if filtered_params:
            url += "?" + urllib.parse.urlencode(filtered_params)

    headers = {}
    body = None

    if is_multipart and file_path:
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"

        with open(file_path, "rb") as f:
            file_content = f.read()

        filename = os.path.basename(file_path)
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: application/xml\r\n\r\n".encode()
            + file_content
            + f"\r\n--{boundary}--\r\n".encode()
        )
    elif data:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 204:
                return {"status": "success", "message": "No Content"}
            response_body = response.read().decode("utf-8")
            if response_body:
                return json.loads(response_body)
            return {"status": "success"}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            error_data = json.loads(error_body)
            print(f"Error {e.code}: {error_data.get('detail', error_body)}", file=sys.stderr)
        except json.JSONDecodeError:
            print(f"Error {e.code}: {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Connection error: {e.reason}", file=sys.stderr)
        print(f"Make sure the backend is running at {base_url}", file=sys.stderr)
        sys.exit(1)


def print_json(data: Any) -> None:
    """Pretty print JSON data."""
    print(json.dumps(data, indent=2, ensure_ascii=False))


def cmd_health(args: argparse.Namespace) -> None:
    """Check API health."""
    result = make_request("GET", "/api/v1/health")
    print_json(result)


def cmd_feeds_list(args: argparse.Namespace) -> None:
    """List all feeds."""
    params = {}
    if args.category_id:
        params["category_id"] = args.category_id
    result = make_request("GET", "/api/v1/feeds", params=params)
    print_json(result)


def cmd_feeds_create(args: argparse.Namespace) -> None:
    """Create a new feed."""
    data = {"url": args.url}
    if args.title:
        data["title"] = args.title
    if args.category_id:
        data["category_id"] = args.category_id
    if args.fetch_interval:
        data["fetch_interval_minutes"] = args.fetch_interval
    result = make_request("POST", "/api/v1/feeds", data=data)
    print_json(result)


def cmd_feeds_get(args: argparse.Namespace) -> None:
    """Get a feed by ID."""
    result = make_request("GET", f"/api/v1/feeds/{args.feed_id}")
    print_json(result)


def cmd_feeds_update(args: argparse.Namespace) -> None:
    """Update a feed."""
    data = {}
    if args.title:
        data["title"] = args.title
    if args.category_id:
        data["category_id"] = args.category_id
    if args.is_active is not None:
        data["is_active"] = args.is_active.lower() == "true"
    if args.fetch_interval:
        data["fetch_interval_minutes"] = args.fetch_interval
    result = make_request("PUT", f"/api/v1/feeds/{args.feed_id}", data=data)
    print_json(result)


def cmd_feeds_delete(args: argparse.Namespace) -> None:
    """Delete a feed."""
    make_request("DELETE", f"/api/v1/feeds/{args.feed_id}")
    print("Feed deleted successfully")


def cmd_feeds_fetch_all(args: argparse.Namespace) -> None:
    """Fetch all active feeds."""
    result = make_request("POST", "/api/v1/feeds/fetch-all")
    print_json(result)


def cmd_feeds_fetch(args: argparse.Namespace) -> None:
    """Fetch a single feed."""
    result = make_request("POST", f"/api/v1/feeds/{args.feed_id}/fetch")
    print_json(result)


def cmd_categories_list(args: argparse.Namespace) -> None:
    """List all categories."""
    result = make_request("GET", "/api/v1/feeds/categories/")
    print_json(result)


def cmd_categories_create(args: argparse.Namespace) -> None:
    """Create a new category."""
    data = {"name": args.name}
    if args.parent_id:
        data["parent_id"] = args.parent_id
    result = make_request("POST", "/api/v1/feeds/categories/", data=data)
    print_json(result)


def cmd_categories_delete(args: argparse.Namespace) -> None:
    """Delete a category."""
    make_request("DELETE", f"/api/v1/feeds/categories/{args.category_id}")
    print("Category deleted successfully")


def cmd_articles_list(args: argparse.Namespace) -> None:
    """List articles with filters."""
    params = {
        "page": args.page,
        "page_size": args.page_size,
        "feed_id": args.feed_id,
        "search": args.search,
        "start_time": args.start_time,
        "end_time": args.end_time,
    }

    if args.unread:
        params["is_read"] = "false"
    elif args.read:
        params["is_read"] = "true"

    if args.starred:
        params["is_starred"] = "true"

    result = make_request("GET", "/api/v1/articles", params=params)
    print_json(result)


def cmd_articles_get(args: argparse.Namespace) -> None:
    """Get an article by ID."""
    result = make_request("GET", f"/api/v1/articles/{args.article_id}")
    print_json(result)


def cmd_articles_toggle_read(args: argparse.Namespace) -> None:
    """Toggle article read status."""
    result = make_request("PUT", f"/api/v1/articles/{args.article_id}/read")
    print_json(result)


def cmd_articles_toggle_star(args: argparse.Namespace) -> None:
    """Toggle article star status."""
    result = make_request("PUT", f"/api/v1/articles/{args.article_id}/star")
    print_json(result)


def cmd_opml_export(args: argparse.Namespace) -> None:
    """Export OPML."""
    base_url = get_api_url()
    url = f"{base_url}/api/v1/opml/export"

    output_path = args.output or "subscriptions.opml"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            content = response.read()
            with open(output_path, "wb") as f:
                f.write(content)
            print(f"OPML exported to {output_path}")
    except urllib.error.URLError as e:
        print(f"Error: {e.reason}", file=sys.stderr)
        sys.exit(1)


def cmd_opml_import(args: argparse.Namespace) -> None:
    """Import OPML from file."""
    result = make_request(
        "POST",
        "/api/v1/opml/import",
        is_multipart=True,
        file_path=args.file,
    )
    print_json(result)


def cmd_opml_import_url(args: argparse.Namespace) -> None:
    """Import OPML from URL."""
    data = {"url": args.url}
    result = make_request("POST", "/api/v1/opml/import-url", data=data)
    print_json(result)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AI Info API Client CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    health_parser = subparsers.add_parser("health", help="Check API health")
    health_parser.set_defaults(func=cmd_health)

    feeds_parser = subparsers.add_parser("feeds", help="Feed management")
    feeds_subparsers = feeds_parser.add_subparsers(dest="subcommand", help="Feed commands")

    feeds_list_parser = feeds_subparsers.add_parser("list", help="List all feeds")
    feeds_list_parser.add_argument("--category-id", type=int, help="Filter by category ID")
    feeds_list_parser.set_defaults(func=cmd_feeds_list)

    feeds_create_parser = feeds_subparsers.add_parser("create", help="Create a new feed")
    feeds_create_parser.add_argument("--url", required=True, help="Feed URL")
    feeds_create_parser.add_argument("--title", help="Feed title")
    feeds_create_parser.add_argument("--category-id", type=int, help="Category ID")
    feeds_create_parser.add_argument("--fetch-interval", type=int, help="Fetch interval in minutes")
    feeds_create_parser.set_defaults(func=cmd_feeds_create)

    feeds_get_parser = feeds_subparsers.add_parser("get", help="Get a feed by ID")
    feeds_get_parser.add_argument("feed_id", type=int, help="Feed ID")
    feeds_get_parser.set_defaults(func=cmd_feeds_get)

    feeds_update_parser = feeds_subparsers.add_parser("update", help="Update a feed")
    feeds_update_parser.add_argument("feed_id", type=int, help="Feed ID")
    feeds_update_parser.add_argument("--title", help="New title")
    feeds_update_parser.add_argument("--category-id", type=int, help="New category ID")
    feeds_update_parser.add_argument("--is-active", help="Active status (true/false)")
    feeds_update_parser.add_argument("--fetch-interval", type=int, help="Fetch interval in minutes")
    feeds_update_parser.set_defaults(func=cmd_feeds_update)

    feeds_delete_parser = feeds_subparsers.add_parser("delete", help="Delete a feed")
    feeds_delete_parser.add_argument("feed_id", type=int, help="Feed ID")
    feeds_delete_parser.set_defaults(func=cmd_feeds_delete)

    feeds_fetch_all_parser = feeds_subparsers.add_parser("fetch-all", help="Fetch all active feeds")
    feeds_fetch_all_parser.set_defaults(func=cmd_feeds_fetch_all)

    feeds_fetch_parser = feeds_subparsers.add_parser("fetch", help="Fetch a single feed")
    feeds_fetch_parser.add_argument("feed_id", type=int, help="Feed ID")
    feeds_fetch_parser.set_defaults(func=cmd_feeds_fetch)

    categories_parser = subparsers.add_parser("categories", help="Category management")
    categories_subparsers = categories_parser.add_subparsers(
        dest="subcommand", help="Category commands"
    )

    categories_list_parser = categories_subparsers.add_parser("list", help="List all categories")
    categories_list_parser.set_defaults(func=cmd_categories_list)

    categories_create_parser = categories_subparsers.add_parser("create", help="Create a category")
    categories_create_parser.add_argument("--name", required=True, help="Category name")
    categories_create_parser.add_argument("--parent-id", type=int, help="Parent category ID")
    categories_create_parser.set_defaults(func=cmd_categories_create)

    categories_delete_parser = categories_subparsers.add_parser("delete", help="Delete a category")
    categories_delete_parser.add_argument("category_id", type=int, help="Category ID")
    categories_delete_parser.set_defaults(func=cmd_categories_delete)

    articles_parser = subparsers.add_parser("articles", help="Article management")
    articles_subparsers = articles_parser.add_subparsers(
        dest="subcommand", help="Article commands"
    )

    articles_list_parser = articles_subparsers.add_parser("list", help="List articles")
    articles_list_parser.add_argument("--feed-id", type=int, help="Filter by feed ID")
    articles_list_parser.add_argument("--unread", action="store_true", help="Show unread articles")
    articles_list_parser.add_argument("--read", action="store_true", help="Show read articles")
    articles_list_parser.add_argument("--starred", action="store_true", help="Show starred articles")
    articles_list_parser.add_argument("--search", help="Search in title")
    articles_list_parser.add_argument("--start-time", help="Start time (ISO 8601 or date)")
    articles_list_parser.add_argument("--end-time", help="End time (ISO 8601 or date)")
    articles_list_parser.add_argument("--page", type=int, default=1, help="Page number")
    articles_list_parser.add_argument("--page-size", type=int, default=20, help="Page size")
    articles_list_parser.set_defaults(func=cmd_articles_list)

    articles_get_parser = articles_subparsers.add_parser("get", help="Get an article by ID")
    articles_get_parser.add_argument("article_id", type=int, help="Article ID")
    articles_get_parser.set_defaults(func=cmd_articles_get)

    articles_read_parser = articles_subparsers.add_parser(
        "toggle-read", help="Toggle article read status"
    )
    articles_read_parser.add_argument("article_id", type=int, help="Article ID")
    articles_read_parser.set_defaults(func=cmd_articles_toggle_read)

    articles_star_parser = articles_subparsers.add_parser(
        "toggle-star", help="Toggle article star status"
    )
    articles_star_parser.add_argument("article_id", type=int, help="Article ID")
    articles_star_parser.set_defaults(func=cmd_articles_toggle_star)

    opml_parser = subparsers.add_parser("opml", help="OPML import/export")
    opml_subparsers = opml_parser.add_subparsers(dest="subcommand", help="OPML commands")

    opml_export_parser = opml_subparsers.add_parser("export", help="Export OPML")
    opml_export_parser.add_argument("-o", "--output", help="Output file path")
    opml_export_parser.set_defaults(func=cmd_opml_export)

    opml_import_parser = opml_subparsers.add_parser("import", help="Import OPML from file")
    opml_import_parser.add_argument("file", help="OPML file path")
    opml_import_parser.set_defaults(func=cmd_opml_import)

    opml_import_url_parser = opml_subparsers.add_parser(
        "import-url", help="Import OPML from URL"
    )
    opml_import_url_parser.add_argument("url", help="OPML URL")
    opml_import_url_parser.set_defaults(func=cmd_opml_import_url)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if hasattr(args, "subcommand") and not args.subcommand:
        subparsers.choices[args.command].print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
