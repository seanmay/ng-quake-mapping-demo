# Quake .map Viewer

## Requirements

- Chrome Canary
- Quake .MAPs [https://valvedev.info/tools/quake-map-sources-and-original-wads/quake_map_sources.zip]
- Quake .WADs [https://valvedev.info/tools/quake-map-sources-and-original-wads/quake_old_wads.zip]

## Why?!?

Because old technology is awesome. And new technology is awesome. And it is interesting to demonstrate to web-developers how powerful the platform can be, and equally interesting to demonstrate to some of the game-dev communities how much better instant feedback (HMR, anyone?) can be for the creative process.

## Setup

- Chrome Canary
  - go to `chrome://flags` ; set `--enable-unsafe-webgpu` ; close and reopen the browser
  - (this feature should ship in stable chrome within a couple of months; it's not as unsafe as it was, when the flag was made)
  - similar nightly / tech-preview browsers with similar flags exist for Safari, FF, Edge, etc
- Unpack Quake MAP .zip into "/quake/assets/id1"
- Unpack Quake WAD .zip into "/quake/assets/id1/gfx"
- rename "/quake/assets/id1/gfx/WIZARD.WAD" to "/quake/assets/id1/gfx/wizard.wad"
  - TODO: automate lowercasing of map/wad files (idSoft was making games on case-insensitive and uppercase-only systems so there are reference mismatches between data and filenames)
- serve from floder quake of project, and navigate to / (index.html)

## Controls

- W,S,A,D (forward, backward, left, right)
- Space, Shift (up, down)

## TODO Features

- mouselook
- automate filename lowercasing for anything in a given mod folder  
  (ie: dump things in "id1" have a tool to lowercase anything inside "id1")
- map selection
- hide trigger / clip / etc entity brushes
- lighting (forward lighting based on light entities in map for now)
- animate `+` textures, `sky` textures, `~` textures (future)
- collision / physics (future)
- play ambient sounds within levels (future; requires Shareware Quake WAD)
- include .MDLs (future; requires Shareware Quake WAD)

## Buglist

- Fix mouselook and "forward" movement
- Port CSG parsing to parse elements using Right-Handed Coordinate System
- Texture UVs are backwards (related to Left-Hand vs Right-Hand coords)
- Texture UV scaling / offsets are incorrect (quick fix is to remove textures that "look" backwards/misaligned; better fix is to actually figure out the algebraic sequence of transforms, once everything is working in a Right-Handed system)
