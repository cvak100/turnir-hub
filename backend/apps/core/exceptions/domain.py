class DomainError(Exception):
    code = "domain_error"
    status_code = 400

    def __init__(self, message, details=None):
        self.message = message
        self.details = details or {}
        super().__init__(message)


class InvalidStateError(DomainError):
    code = "invalid_state"
    status_code = 409


class ConflictError(DomainError):
    code = "conflict"
    status_code = 409
