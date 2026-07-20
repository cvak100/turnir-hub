"""
Action-based required_permission helpers for ViewSets.
"""


def set_action_permission(view, mapping: dict, default: str):
    """
    mapping example:
        {
            "create": "edition.create",
            "update": "edition.edit",
            "partial_update": "edition.edit",
            "destroy": "edition.delete",
            "list": "edition.view",
            "retrieve": "edition.view",
        }
    """
    view.required_permission = mapping.get(view.action, default)
