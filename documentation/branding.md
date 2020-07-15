# Customize Twake

## Customize style and logos

You can customize Twake for your brand using the `backend/core/app/Configuration/Parameters.php` file.

```
"defaults" => [
  "branding" => [
    "header" => [
      "logo" => '', //Some logo used on header coloured background
      "apps" => [ //A list of apps accessible from header
        [
          "name"=> '', //App name
          "url"=> '', //Url to your app
          "icon"=> '', //App icon as image
        ],
      ],
    ],
    "style" => [
      "color" => '#2196F3', //Change default main color
      "default_border_radius" => '2', //Change default main border-radius
    ],
    "name" => "", //Brand name
    "link" => "", //Link to your website (showed on login page)
    "logo" => "" //Coloured logo (white background)
  ]
]
```

## Customize apps

You can disable default apps with this command (apps will not be installed on future new companies or workspaces)

`[not implemented yet]`
