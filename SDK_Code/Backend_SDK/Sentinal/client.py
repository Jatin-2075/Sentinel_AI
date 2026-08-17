import httpx

from .types import SentinelEvent


class Sentinel:
    def __init__(self, api_key: str, endpoint: str):
        self.api_key = api_key
        self.endpoint = endpoint

    async def send_event(
        self,
        event: dict | SentinelEvent
    ):
        if isinstance(event, SentinelEvent):
            event = event.to_dict()

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.endpoint,
                    json=event,
                    headers=headers,
                    timeout=0.5,
                )

                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as exc:
            print(f"[Sentinel] failed to send event: {exc}")
            return None