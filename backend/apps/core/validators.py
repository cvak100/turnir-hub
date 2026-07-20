from django.core.exceptions import ValidationError


def validate_image_file(file_obj):
    """Validate uploaded images: type and max size (5 MB)."""
    max_size = 5 * 1024 * 1024
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}

    content_type = getattr(file_obj, "content_type", None)
    if content_type and content_type not in allowed:
        raise ValidationError("Only JPEG, PNG, WEBP or GIF images are allowed.")

    if file_obj.size > max_size:
        raise ValidationError("Image file too large (max 5 MB).")
