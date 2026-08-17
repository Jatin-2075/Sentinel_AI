import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from fastapi import Requests 

from .client import Sentinel
from .types import SentinelEvent

class SentinelMiddleware(BaseHTTPMiddleware):
    def __init__( self, app, client : Sentinel, service : str, environment : str, ):
        super.__init__(app)

        self.client = client
        self.service = service
        self.environment = environment

    async def dispatch( self, request : Request , call_next):
        start = time.perf_counter()

        status_code = 500
        result = "failure"
        error_type = None
        error_message = None

        try : 
            response = await call_next(request)

            status_code = response.status_code

            if status_code < 400:
                result = "success"
            else: 
                result = "failure"

            return response
        
        except Exception as exc:
            error_type = type(exc).__name__
            error_message = str(exc)

            raise

        finally:
            duration_ms = (
                time.perf_counter() - start
            ) * 1000

            event = SentinelEvent(
                source="backend",
                service=self.service,
                environment=self.environment,
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration_ms=round(duration_ms, 2),
                result=result,
                timestamp=datetime.now(timezone.utc).isformat(),
                error_message=error_message,
                error_type=error_type,
            )

            asyncio.create_task( self.client.send_event(event) )