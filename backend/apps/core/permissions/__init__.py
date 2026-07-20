from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsPublicReadOrHasPermission(BasePermission):
    """
    SAFE methods are public.
    Write methods require authentication; ViewSet still applies HasPermission etc.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)
