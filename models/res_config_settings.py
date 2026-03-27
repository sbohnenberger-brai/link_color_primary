from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    link_color_primary = fields.Char(
        string="Standard-Linkfarbe im Backend",
        config_parameter="link_color_primary.color",
        default="#005bbb",
        help="Hex-Farbwert für Links im Backend-Editor, z. B. #005bbb",
    )
