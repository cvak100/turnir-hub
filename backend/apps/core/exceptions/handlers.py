import logging
import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from apps.core.exceptions.domain import DomainError

logger = logging.getLogger("turnir.api")
auth_logger = logging.getLogger("turnir.auth")
REQUEST_ID_HEADER = "X-Request-ID"


def _request_id(context) -> str:
    request = context.get("request")
    if request is None:
        return str(uuid.uuid4())
    return getattr(request, "request_id", None) or str(uuid.uuid4())


def _error_payload(*, code: str, message: str, details=None, request_id: str):
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "request_id": request_id,
        },
    }


def custom_exception_handler(exc, context):
    request_id = _request_id(context)
    request = context.get("request")

    if isinstance(exc, DomainError):
        logger.warning(
            "domain_error request_id=%s code=%s message=%s path=%s user_id=%s",
            request_id,
            exc.code,
            exc.message,
            getattr(request, "path", None),
            getattr(getattr(request, "user", None), "id", None),
        )
        response = Response(
            _error_payload(
                code=exc.code,
                message=exc.message,
                details=exc.details,
                request_id=request_id,
            ),
            status=exc.status_code,
        )
        response[REQUEST_ID_HEADER] = request_id
        return response

    response = exception_handler(exc, context)
    if response is not None:
        code = "validation_error"
        message = "Invalid input."
        status_code = response.status_code

        if status_code == status.HTTP_401_UNAUTHORIZED:
            code = "authentication_failed"
            message = "Authentication credentials were not provided or are invalid."
        elif status_code == status.HTTP_403_FORBIDDEN:
            code = "permission_denied"
            message = "You do not have permission to perform this action."
        elif status_code == status.HTTP_404_NOT_FOUND:
            code = "not_found"
            message = "Resource not found."
        elif status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            code = "rate_limited"
            message = "Too many requests."

        details = response.data
        if isinstance(details, dict) and "detail" in details and len(details) == 1:
            message = str(details["detail"])
            details = {}
        elif not isinstance(details, dict):
            details = {"non_field_errors": details}

        log_message = (
            "%s request_id=%s code=%s message=%s path=%s method=%s user_id=%s status=%s"
        )
        log_args = (
            code,
            request_id,
            code,
            message,
            getattr(request, "path", None),
            getattr(request, "method", None),
            getattr(getattr(request, "user", None), "id", None),
            status_code,
        )
        if status_code == status.HTTP_401_UNAUTHORIZED:
            auth_logger.warning(log_message, *log_args)
        elif status_code >= 400:
            logger.warning(log_message, *log_args)

        response.data = _error_payload(
            code=code,
            message=message,
            details=details,
            request_id=request_id,
        )
        response[REQUEST_ID_HEADER] = request_id
        return response

    logger.exception(
        "unhandled_exception request_id=%s path=%s exception=%s",
        request_id,
        getattr(request, "path", None),
        exc,
    )
    response = Response(
        _error_payload(
            code="server_error",
            message="An unexpected error occurred.",
            request_id=request_id,
        ),
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    response[REQUEST_ID_HEADER] = request_id
    return response
