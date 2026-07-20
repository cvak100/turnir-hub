import logging
import time
import uuid

logger = logging.getLogger("turnir.api")


class RequestIDMiddleware:
    """Attach a unique request_id to each request and response."""

    HEADER = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get(self.HEADER) or str(uuid.uuid4())
        request.request_id = request_id

        start = time.perf_counter()
        user_id = getattr(getattr(request, "user", None), "id", None)
        logger.info(
            "request_started request_id=%s method=%s path=%s user_id=%s",
            request_id,
            request.method,
            request.path,
            user_id,
        )

        response = self.get_response(request)
        duration_ms = int((time.perf_counter() - start) * 1000)
        response[self.HEADER] = request_id

        logger.info(
            "request_finished request_id=%s method=%s path=%s status_code=%s duration_ms=%s user_id=%s",
            request_id,
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            user_id,
        )
        return response
