{
    "name": "Brainson: Link Color Primary",
    "version": "19.0.1.0.0",
    "summary": "Override backend editor link color and picker defaults",
    "category": "Tools",
    "author": "Custom",
    "license": "LGPL-3",
    "depends": ["web", "mail"],
    "data": [
        "views/res_config_settings_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "link_color_primary/static/src/js/link_color_primary.js",
        ],
    },
    "installable": True,
    "application": False,
}
