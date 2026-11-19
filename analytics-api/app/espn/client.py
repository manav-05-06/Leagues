import asyncio
import logging
import random
import time
from typing import Any

import httpx
from cachetools import TTLCache

from app.config import settings

logger = logging.getLogger(__name__)

ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/all"

# In-memory TTL cache for responses (up to 1000 items, default 20s TTL)
_summary_cache: TTLCache = TTLCache(maxsize=1000, ttl=settings.cache_live_ttl)

# Persistent stale fallback cache so 429/5xx serves the last known good data
_stale_cache: dict[str, dict[str, Any]] = {}

# Allow at most 4 concurrent requests to ESPN
_espn_semaphore = asyncio.Semaphore(4)

# Lock and mapping to merge duplicate in-flight requests
_inflight_lock = asyncio.Lock()
_inflight_requests: dict[str, asyncio.Future[dict[str, Any]]] = {}

# Shared persistent async client
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=settings.espn_timeout_seconds,
            headers={
                "User-Agent": "LeaguesMatchAnalytics/1.0 (Educational open analytics platform)"
            },
        )
    return _http_client


async def close_http_client() -> None:
    global _http_client
    if _http_client is not None and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


async def fetch_json(url: str) -> dict[str, Any]:
    """Fetch a JSON URL from ESPN with request merging, concurrency limits, and stale-while-error fallback."""
    # 1. Check TTL cache
    if url in _summary_cache:
        return _summary_cache[url]

    # 2. Check if another coroutine is already fetching this exact URL
    async with _inflight_lock:
        if url in _summary_cache:
            return _summary_cache[url]

        if url in _inflight_requests:
            future = _inflight_requests[url]
        else:
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            _inflight_requests[url] = future
            asyncio.create_task(_do_fetch(url, future))

    # Await the shared future
    return await future


async def _do_fetch(
    url: str,
    future: asyncio.Future[dict[str, Any]],
) -> None:
    client = get_http_client()
    t0 = time.time()

    try:
        async with _espn_semaphore:
            max_attempts = 2
            last_exc: Exception | None = None

            for attempt in range(max_attempts):
                try:
                    response = await client.get(url)
                    if (
                        response.status_code in (429, 500, 502, 503, 504)
                        and attempt < max_attempts - 1
                    ):
                        jitter = random.uniform(0.3, 0.8)
                        await asyncio.sleep(jitter)
                        continue

                    response.raise_for_status()
                    data = response.json()

                    # Cache successful response in both TTL and stale backup
                    _summary_cache[url] = data
                    _stale_cache[url] = data

                    if not future.done():
                        future.set_result(data)
                    return

                except Exception as exc:  # noqa: BLE001
                    last_exc = exc
                    elapsed = time.time() - t0
                    logger.warning(
                        "ESPN request failed for %s (attempt %d, elapsed %.2fs): %s",
                        url,
                        attempt + 1,
                        elapsed,
                        exc,
                    )

            # If we failed all attempts, serve stale cached data if available
            if url in _stale_cache:
                stale_data = dict(_stale_cache[url])
                stale_data["_stale"] = True
                logger.info("Serving stale cached data for %s following upstream error", url)
                if not future.done():
                    future.set_result(stale_data)
            else:
                if not future.done() and last_exc is not None:
                    future.set_exception(last_exc)

    finally:
        async with _inflight_lock:
            _inflight_requests.pop(url, None)


async def get_summary(event_id: str) -> dict[str, Any]:
    """Fetch match summary for an event ID."""
    url = f"{ESPN_BASE_URL}/summary?event={event_id}"
    return await fetch_json(url)
