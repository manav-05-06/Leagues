import pytest
import respx

from app.espn.client import (
    ESPN_BASE_URL,
    _inflight_requests,
    _stale_cache,
    _summary_cache,
    close_http_client,
    get_summary,
)


@pytest.mark.asyncio
async def test_get_summary_caching_and_merging():
    await close_http_client()
    _summary_cache.clear()
    _stale_cache.clear()
    _inflight_requests.clear()

    event_id = "test_event_caching_999"
    target_url = f"{ESPN_BASE_URL}/summary?event={event_id}"
    mock_response = {"id": event_id, "header": {"mock": True}}

    with respx.mock:
        route = respx.get(target_url).respond(200, json=mock_response)

        # First call
        res1 = await get_summary(event_id)
        assert res1 == mock_response
        assert route.call_count == 1

        # Second call should hit the cache, not the network
        res2 = await get_summary(event_id)
        assert res2 == mock_response
        assert route.call_count == 1

    await close_http_client()


@pytest.mark.asyncio
async def test_get_summary_stale_fallback_on_500():
    await close_http_client()
    _summary_cache.clear()
    _stale_cache.clear()
    _inflight_requests.clear()

    event_id = "test_event_stale_888"
    target_url = f"{ESPN_BASE_URL}/summary?event={event_id}"

    # Pre-populate stale cache
    old_data = {"id": event_id, "header": {"cached": True}}
    _stale_cache[target_url] = old_data

    with respx.mock:
        # Upstream returns 500 error
        respx.get(target_url).respond(500)

        data = await get_summary(event_id)
        assert data["_stale"] is True
        assert data["header"]["cached"] is True

    await close_http_client()
