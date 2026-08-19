# Third-party notices

## ccrsxx/twitter-clone

Parts of NSosyal’s social interface were adapted from the layout and component
anatomy of [ccrsxx/twitter-clone](https://github.com/ccrsxx/twitter-clone),
pinned at commit `62a9588577ec6f5ce6d28b50d30bf46d2229453d`.

Adapted ideas include the three-region responsive shell, desktop-to-bottom-nav
navigation transition, tabbed central timeline, composer lifecycle, tweet-card
action row, nested reply presentation, profile header, and contextual tweet
action menu. The implementation has been rewritten for this project’s React 19
and Cloudflare Sites stack with local seeded data only; it contains no donor
Firebase, authentication, router, SWR, or network runtime code.

The donor project is licensed under the MIT License. Its license text is
preserved in `licenses/ccrsxx-twitter-clone-MIT.txt`.

## Next Sosyal Beta source-era brand assets

`public/brand/nsosyal-source-era-logo-dark.svg` and
`public/brand/nsosyal-source-era-logo-light.svg` are copied verbatim from the
user-provided Next Sosyal Beta source snapshot at
`Next_Sosyal_Beta_2025_08_01/Next_Sosyal_Beta/app/javascript/images/`.
They are used solely as NSosyal brand assets. No source application code,
JavaScript, stylesheets, or backend components from that project were copied
into this prototype; its component anatomy was independently reimplemented.

The supplied source snapshot is licensed under GNU AGPL v3. Its license text
is preserved in `licenses/Next_Sosyal_Beta_AGPL-3.0.txt`.
