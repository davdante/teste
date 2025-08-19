#!/usr/bin/env python3
"""
OSINT Camera Access Tool — SAFE, MODERN, ASYNC EDITION
=====================================================

This build focuses **exclusively** on consuming/validating public, officially
published camera feeds (tourism, traffic, weather) and avoids any network
scanning, device enumeration, or grey-area sources.

Key upgrades
------------
- Modern CLI with Typer & rich output tables/spinners
- Async HTTP via httpx + concurrency controls
- Pydantic models for typed configs & results
- Robust timeouts, retries (tenacity), and graceful cancellation
- Optional OpenCV screenshots (for direct stream/image URLs only)
- JSON + Markdown report generation
- Pluggable provider architecture (example providers included)
- Caching of validations to minimize repeated network hits
- Structured logging with loguru

Ethical/Safety Guardrails
-------------------------
- No IP scanning or Shodan enumeration.
- Only interacts with URLs already publicly published by official sites.
- Conservative content-type checks; best-effort verification without scraping
  dynamic JS-only pages.

Requirements
------------
python >= 3.9

pip install -U \
  typer[all] httpx pydantic tenacity rich loguru diskcache

# Optional for screenshots
pip install opencv-python

Usage
-----
# List known public feeds and verify reachability
python osint_camera_tool_plus.py public-feeds --verify

# Generate reports
python osint_camera_tool_plus.py public-feeds --verify \
  --report-json camera_report.json --report-md camera_report.md

# Try to capture screenshots from direct streams (if any)
python osint_camera_tool_plus.py screenshots --limit 3

"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import httpx
import typer
from diskcache import Cache
from loguru import logger
from pydantic import BaseModel, HttpUrl, Field
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

# --- Optional dependency (OpenCV) ---
try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional
    cv2 = None  # screenshots disabled if missing


app = typer.Typer(add_completion=False, no_args_is_help=True, help="OSINT Public Camera Tool (Safe)")
console = Console()

CACHE_DIR = Path(".cache/osint-camera")
CACHE_DIR.mkdir(parents=True, exist_ok=True)
cache = Cache(str(CACHE_DIR))

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
)

# Safer explicit timeout fields for broad httpx compatibility
DEFAULT_TIMEOUT = httpx.Timeout(connect=8.0, read=12.0, write=12.0, pool=8.0)
MAX_CONCURRENCY = 10


# -------------------- Helpers (compat) --------------------
def model_to_dict(model: BaseModel) -> dict:
    """Pydantic v1/v2 compatible model -> dict."""
    if hasattr(model, "model_dump"):
        return model.model_dump()  # pydantic v2
    return model.dict()  # pydantic v1


def model_to_json(model: BaseModel, indent: Optional[int] = None) -> str:
    """Pydantic v1/v2 compatible model -> JSON string."""
    if hasattr(model, "model_dump_json"):
        # pydantic v2
        if indent is None:
            return model.model_dump_json()
        # model_dump_json supports indent parameter in v2
        return model.model_dump_json(indent=indent)
    # pydantic v1
    if indent is None:
        return model.json()
    return model.json(indent=indent)


# -------------------- Models --------------------
class CameraFeed(BaseModel):
    name: str
    url: HttpUrl
    location: Optional[str] = None
    type: str = Field(default="public")  # tourism/traffic/weather/etc


class CameraCheckResult(BaseModel):
    name: str
    url: HttpUrl
    ok: bool
    status_code: Optional[int] = None
    content_type: Optional[str] = None
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Report(BaseModel):
    timestamp: datetime
    total_feeds: int
    verified_ok: int
    results: List[CameraCheckResult]


# -------------------- Providers --------------------
class Provider:
    """Base Provider that returns a list of public CameraFeed entries.
    Subclass to add more curated providers (prefer official sources).
    """

    name: str = "base"

    async def feeds(self) -> List[CameraFeed]:  # pragma: no cover (override)
        return []


class StaticProvider(Provider):
    name = "static-curated"

    def __init__(self) -> None:
        self._feeds = [
            CameraFeed(
                name="Times Square, NYC",
                url="https://www.earthcam.com/usa/newyork/timessquare/?cam=tsstreet",
                location="New York, USA",
                type="tourism",
            ),
            CameraFeed(
                name="Abbey Road, London",
                url="https://www.earthcam.com/world/england/london/abbeyroad/?cam=abbeyroad_uk",
                location="London, UK",
                type="tourism",
            ),
            CameraFeed(
                name="Niagara Falls",
                url="https://www.niagarafallsstatepark.com/niagara-falls-webcam",
                location="Niagara Falls, USA",
                type="tourism",
            ),
        ]

    async def feeds(self) -> List[CameraFeed]:
        return self._feeds


# In the future, add providers that consume *official* JSON APIs.
PROVIDERS: List[Provider] = [StaticProvider()]


# -------------------- Networking --------------------
class PublicCameraClient:
    def __init__(self, timeout: httpx.Timeout = DEFAULT_TIMEOUT):
        self.timeout = timeout
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "*/*",
            },
        )
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

    async def aclose(self) -> None:  # cleanup
        await self.client.aclose()

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
        retry=retry_if_exception_type(
            (
                httpx.ReadTimeout,
                httpx.ConnectTimeout,
                httpx.RemoteProtocolError,
                httpx.HTTPStatusError,
            )
        ),
    )
    async def _fetch_head(self, url: str) -> httpx.Response:
        # Prefer HEAD, fall back to GET with stream if HEAD is not allowed.
        resp = await self.client.head(url, follow_redirects=True)
        if resp.status_code >= 400:
            # Some sites disallow HEAD; raise to trigger GET fallback logic outside.
            raise httpx.HTTPStatusError("HEAD not OK", request=resp.request, response=resp)
        return resp

    async def _fetch_stream_probe(self, url: str) -> httpx.Response:
        # Stream small GET to peek headers/chunk, without downloading full content.
        return await self.client.get(url, follow_redirects=True)

    async def check_url(self, feed: CameraFeed) -> CameraCheckResult:
        # Cache by URL for 15 minutes
        cache_key = f"check:{str(feed.url)}"
        cached = cache.get(cache_key)
        if cached:
            return CameraCheckResult(**cached)

        async with self.semaphore:
            # First try HEAD
            try:
                resp = await self._fetch_head(str(feed.url))
                ct = resp.headers.get("content-type", "").lower()
                ok = resp.status_code < 400 and any(
                    token in ct for token in ("image", "video", "mjpeg", "multipart", "stream")
                )
                # If content-type is generic text/html, still consider reachable but not a direct stream
                if not ok and "text/html" in ct:
                    result = CameraCheckResult(
                        name=feed.name,
                        url=feed.url,
                        ok=True,  # reachable page
                        status_code=resp.status_code,
                        content_type=ct,
                        reason="Reachable HTML page (embed/JS likely).",
                    )
                    cache.set(cache_key, model_to_dict(result), expire=900)
                    return result

                result = CameraCheckResult(
                    name=feed.name,
                    url=feed.url,
                    ok=ok,
                    status_code=resp.status_code,
                    content_type=ct,
                    reason=None if ok else "Unsupported content-type",
                )
                cache.set(cache_key, model_to_dict(result), expire=900)
                return result
            except Exception as e:
                # Fallback GET
                try:
                    resp = await self._fetch_stream_probe(str(feed.url))
                    ct = resp.headers.get("content-type", "").lower()
                    ok = resp.status_code < 400 and any(
                        token in ct for token in ("image", "video", "mjpeg", "multipart", "stream")
                    )
                    if not ok and "text/html" in ct:
                        result = CameraCheckResult(
                            name=feed.name,
                            url=feed.url,
                            ok=True,
                            status_code=resp.status_code,
                            content_type=ct,
                            reason="Reachable HTML page (embed/JS likely).",
                        )
                        cache.set(cache_key, model_to_dict(result), expire=900)
                        return result

                    result = CameraCheckResult(
                        name=feed.name,
                        url=feed.url,
                        ok=ok,
                        status_code=resp.status_code,
                        content_type=ct,
                        reason=str(e) if not ok else None,
                    )
                    cache.set(cache_key, model_to_dict(result), expire=900)
                    return result
                except Exception as e2:
                    result = CameraCheckResult(
                        name=feed.name,
                        url=feed.url,
                        ok=False,
                        status_code=None,
                        content_type=None,
                        reason=f"{type(e2).__name__}: {e2}",
                    )
                    cache.set(cache_key, model_to_dict(result), expire=600)
                    return result


# -------------------- Utilities --------------------
async def gather_feeds() -> List[CameraFeed]:
    feeds: List[CameraFeed] = []
    for provider in PROVIDERS:
        try:
            items = await provider.feeds()
            feeds.extend(items)
        except Exception as e:
            logger.warning(f"Provider {provider.name} failed: {e}")
    return feeds


async def verify_feeds(client: PublicCameraClient, feeds: List[CameraFeed]) -> List[CameraCheckResult]:
    tasks = [client.check_url(f) for f in feeds]
    return await asyncio.gather(*tasks)


def make_report(results: List[CameraCheckResult]) -> Report:
    ok_count = sum(1 for r in results if r.ok)
    return Report(
        timestamp=datetime.now(timezone.utc),
        total_feeds=len(results),
        verified_ok=ok_count,
        results=results,
    )


def save_report_json(report: Report, path: Path) -> None:
    # Prefer pydantic-native JSON for correct datetime encoding
    path.write_text(model_to_json(report, indent=2), encoding="utf-8")


def save_report_md(report: Report, path: Path) -> None:
    lines = [
        f"# OSINT Public Camera Report",
        f"Generated: {report.timestamp.isoformat()}",
        "",
        f"**Total feeds:** {report.total_feeds}",
        f"**Reachable/OK:** {report.verified_ok}",
        "",
        "| Name | URL | OK | Status | Content-Type | Note |",
        "|---|---|:--:|:--:|---|---|",
    ]
    for r in report.results:
        lines.append(
            f"| {r.name} | {r.url} | {'✅' if r.ok else '❌'} | {r.status_code or ''} | {r.content_type or ''} | {r.reason or ''} |"
        )
    path.write_text("\n".join(lines), encoding="utf-8")


# -------------------- CLI Commands --------------------
@app.command()
def public_feeds(
    verify: bool = typer.Option(False, help="Verify reachability of feeds"),
    report_json: Optional[Path] = typer.Option(None, help="Path to save JSON report"),
    report_md: Optional[Path] = typer.Option(None, help="Path to save Markdown report"),
):
    """List curated public feeds, optionally verify and export reports."""
    console.print(Panel.fit("[bold]OSINT Public Camera Tool[/bold] — safe mode", title="Info", box=box.ROUNDED))

    async def _run() -> None:
        feeds = await gather_feeds()
        if not verify:
            table = Table(box=box.SIMPLE_HEAVY)
            table.add_column("#", justify="right")
            table.add_column("Name")
            table.add_column("Type")
            table.add_column("Location")
            table.add_column("URL")
            for i, f in enumerate(feeds, 1):
                table.add_row(str(i), f.name, f.type, f.location or "", str(f.url))
            console.print(table)
            console.print(f"[dim]{len(feeds)} feeds listed.[/dim]")
            return

        client = PublicCameraClient()
        try:
            with console.status("Verifying feeds..."):
                results = await verify_feeds(client, feeds)
        finally:
            await client.aclose()

        # Show table
        table = Table(box=box.SIMPLE_HEAVY)
        table.add_column("#", justify="right")
        table.add_column("Name")
        table.add_column("OK", justify="center")
        table.add_column("Status", justify="center")
        table.add_column("Type")
        table.add_column("Content-Type")
        table.add_column("Note")
        for i, r in enumerate(results, 1):
            table.add_row(
                str(i), r.name, "✅" if r.ok else "❌", str(r.status_code or ""),
                "public", r.content_type or "", r.reason or "",
            )
        console.print(table)

        report = make_report(results)
        if report_json:
            save_report_json(report, report_json)
            console.print(f"Saved JSON report to [bold]{report_json}[/bold]")
        if report_md:
            save_report_md(report, report_md)
            console.print(f"Saved Markdown report to [bold]{report_md}[/bold]")

    asyncio.run(_run())


@app.command()
def screenshots(
    output_dir: Path = typer.Option(Path("screenshots"), help="Directory to save screenshots"),
    limit: int = typer.Option(5, help="Limit number of feeds to attempt"),
):
    """Attempt to capture screenshots from direct image/stream URLs.

    Note: Many public pages embed JS players or iframes and may not expose a
    direct stream URL. This function only works for direct image/mjpeg/mp4 URLs
    and requires OpenCV if videos are involved.
    """
    if cv2 is None:
        console.print("[yellow]OpenCV not available. Install opencv-python to enable screenshots.[/yellow]")
        raise typer.Exit(code=1)

    async def _run() -> None:
        feeds = await gather_feeds()
        feeds = feeds[:limit]
        client = PublicCameraClient()
        try:
            results = await verify_feeds(client, feeds)
        finally:
            await client.aclose()

        output_dir.mkdir(parents=True, exist_ok=True)
        saved = 0
        for r in results:
            # We attempt only if content-type hints direct media
            if r.ok and r.content_type and any(t in r.content_type for t in ("image", "video", "mjpeg")):
                try:
                    cap = cv2.VideoCapture(str(r.url))
                    try:
                        if cap.isOpened():
                            ok, frame = cap.read()
                            if ok:
                                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                                fname = output_dir / f"{r.name.replace(' ', '_')}_{ts}.jpg"
                                cv2.imwrite(str(fname), frame)
                                console.print(f"Saved screenshot: {fname}")
                                saved += 1
                            else:
                                console.print(f"[dim]No frame read from {r.url}[/dim]")
                        else:
                            console.print(f"[dim]Cannot open stream: {r.url}[/dim]")
                    finally:
                        try:
                            cap.release()
                        except Exception:
                            pass
                except Exception as e:
                    console.print(f"[red]Error capturing {r.url}: {e}[/red]")
        console.print(f"Screenshots saved: [bold]{saved}[/bold]")

    asyncio.run(_run())


# -------------------- Entry --------------------
if __name__ == "__main__":
    # Configure loguru to log to file + stderr
    LOG_DIR = Path("logs")
    LOG_DIR.mkdir(exist_ok=True)
    logger.add(LOG_DIR / "osint_camera.log", rotation="1 MB", retention=5)
    app()

