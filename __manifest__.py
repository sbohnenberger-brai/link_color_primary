{
    "name": "Brainson Odoo: Link Color Primary",
    "version": "19.0.3.0.0",
    "summary": "Force Odoo editor links to use your primary brand color",
    "category": "Tools",
    "author": "Custom",
    "license": "LGPL-3",
    "depends": ["web", "mail", "portal"],
    "assets": {
        "web.assets_backend": [
            "link_color_primary/static/src/js/link_color_primary.js",
            "link_color_primary/static/src/css/link_color_primary.css",
        ],
        "web.assets_frontend": [
            "link_color_primary/static/src/js/link_color_primary.js",
            "link_color_primary/static/src/css/link_color_primary.css",
        ],
    },
    "installable": True,
    "application": False,
}
