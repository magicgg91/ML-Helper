# Fonts served from this repository

Bloc 116/A. The three display families are checked in here and loaded with
`next/font/local` (see `src/app/layout.tsx`). They used to come from
`next/font/google`, which downloads them from Google at build time and at
every `next dev` start — a network call in the critical path of the build.
It failed twice in one morning in CI (the Docker image job of PR #140, then
the e2e web server of PR #141), each time with
`Can't resolve '@vercel/turbopack-next/internal/font/google/font'` and a
build or a 60s Playwright timeout behind it. Files on disk cannot fail that
way.

Each file is the exact `latin` subset Google serves for that family and
weight — the same bytes `next/font/google` was fetching, for the same
`subsets: ["latin"]` and the same weights the stylesheet uses. Nothing
else is bundled: no latin-ext, no cyrillic, no greek, no vietnamese.

| File | Family | Weight | Source |
|---|---|---|---|
| `ibm-plex-sans-400-latin.woff2` | IBM Plex Sans | 400 | Google Fonts, latin subset |
| `ibm-plex-sans-500-latin.woff2` | IBM Plex Sans | 500 | Google Fonts, latin subset |
| `ibm-plex-sans-600-latin.woff2` | IBM Plex Sans | 600 | Google Fonts, latin subset |
| `cinzel-600-latin.woff2` | Cinzel | 600 | Google Fonts, latin subset |
| `cinzel-700-latin.woff2` | Cinzel | 700 | Google Fonts, latin subset |
| `jetbrains-mono-400-latin.woff2` | JetBrains Mono | 400 | Google Fonts, latin subset |
| `jetbrains-mono-500-latin.woff2` | JetBrains Mono | 500 | Google Fonts, latin subset |
| `jetbrains-mono-600-latin.woff2` | JetBrains Mono | 600 | Google Fonts, latin subset |

To add a weight, take the `/* latin */` `@font-face` block from
`https://fonts.googleapis.com/css2?family=<Family>:wght@<weight>&display=swap`
(with a browser User-Agent, or Google answers with TTF), download the
`.woff2` it points at, and declare it beside the others in `layout.tsx`.

## Licence

All three families are licensed under the SIL Open Font License 1.1, whose
full text follows. They are redistributed here unmodified.

- IBM Plex Sans — Copyright 2017 IBM Corp. (https://github.com/IBM/plex)
- Cinzel — Copyright 2012 The Cinzel Project Authors
  (https://github.com/NDISCOVER/Cinzel)
- JetBrains Mono — Copyright 2020 The JetBrains Mono Project Authors
  (https://github.com/JetBrains/JetBrainsMono)

---

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
