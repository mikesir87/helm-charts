package shared

REQUIRED_SELECTOR_LABELS := [
    "app.kubernetes.io/name",
    "app.kubernetes.io/instance",
]

REQUIRED_LABELS := array.concat(REQUIRED_SELECTOR_LABELS, [
    "helm.sh/chart",
    "app.kubernetes.io/version",
    "app.kubernetes.io/managed-by",
])
