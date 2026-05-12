# MoodStream KZ — Figma Design Specification

**Theme:** "Steppe Resonance" — obsidian night, copper warmth, turquoise signal
**Last updated:** 2026-04-07

---

## 1. Design System

### 1.1 Color Palette

| Token | Hex / Value | Usage |
|---|---|---|
| `bg` | `#0F1419` | Screen backgrounds (Obsidian Night) |
| `bgDeep` | `#0A0E27` | Deep navy, gradient starts |
| `surface` | `#151B35` | Card backgrounds, dark navy |
| `surfaceGlass` | `rgba(255,255,255,0.05)` | Glassmorphism cards, overlays |
| `surfaceElevated` | `#1E2540` | Elevated surfaces, skeleton shimmer |
| `border` | `rgba(255,255,255,0.08)` | Default borders |
| `borderSubtle` | `rgba(255,255,255,0.05)` | De-emphasized borders |
| `accent` | `#C87B4E` | Copper — primary CTA, active state, seek bar fill |
| `accentLight` | `#D4B896` | Warm Sand — active track title, highlights |
| `accentDim` | `rgba(200,123,78,0.15)` | Active row background, badge background |
| `accentGlow` | `rgba(200,123,78,0.30)` | Glow effects, shadows |
| `turquoise` | `#4FC5C7` | Downloads, offline indicator |
| `coral` | `#E57B6E` | Likes, danger, warning |
| `gold` | `#D4B896` | Chart positions #1–3 highlight |
| `textPrimary` | `#F5F5F7` | Body text, track titles (Soft White) |
| `textSecondary` | `#A39B8B` | Artist names, subtitles (Warm Gray) |
| `textMuted` | `#5A5248` | Timestamps, indexes, disabled text |
| `danger` | `#E57B6E` | Destructive actions, errors |

**Gradient presets:**
- Header gradient: `bgDeep (#0A0E27)` → `bg (#0F1419)` vertical, 200px
- Cover glow: radial, `accentGlow` at center, transparent at edge
- Play button shadow: `accent` with elevation 12, shadowRadius 20

### 1.2 Typography Scale

| Name | Size | Weight | Letter Spacing | Line Height | Usage |
|---|---|---|---|---|---|
| `display` | 36px | 800 | -1.0 | 1.1 | App name on login |
| `h1` | 30px | 800 | -1.0 | 1.1 | Home screen app name |
| `h2` | 26px | 700 | -0.5 | 1.15 | Page headers (Library, Artist name) |
| `h3` | 22px | 700 | -0.3 | 1.2 | Album title, Track title in FullPlayer |
| `h4` | 18px | 700 | -0.3 | 1.2 | Section headers, Chart title |
| `body1` | 16px | 400 | 0 | 1.5 | Form inputs, primary CTA text |
| `body2` | 15px | 500 | 0 | 1.5 | Artist names in Search, Row labels |
| `body3` | 14px | 600 | 0 | 1.4 | Track titles in rows |
| `caption1` | 13px | 400 | 0 | 1.4 | Artist names in rows, meta info |
| `caption2` | 12px | 400 | 0 | 1.4 | Timestamps, durations, index numbers |
| `label` | 12px | 600 | 0.8 | 1.0 | Section category headers (UPPERCASE) |
| `micro` | 11px | 800 | 0.5 | 1.0 | Badges (KZ, chart position) |

**Font family:** System default (San Francisco on iOS, Roboto on Android). No custom fonts in MVP.

### 1.3 Spacing Scale (4px base grid)

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Icon gaps, tight padding |
| `sm` | 8px | Button icon gap, border padding |
| `md` | 12px | Control gaps, row internal spacing |
| `lg` | 16px | Horizontal padding, card padding |
| `xl` | 20px | Section padding, header vertical |
| `2xl` | 24px | Screen horizontal padding |
| `3xl` | 32px | Seek bar padding, login inner padding |
| `4xl` | 40px | Large vertical gaps |
| `5xl` | 60px | Empty state top padding |

### 1.4 Elevation / Shadows

| Name | Shadow Color | Offset | Opacity | Radius | Elevation (Android) |
|---|---|---|---|---|---|
| `low` | `rgba(0,0,0,0.3)` | 0,2 | 0.3 | 4 | 2 |
| `medium` | `accent` | 0,4 | 0.35 | 12 | 6 |
| `high` | `accent` | 0,4 | 0.50 | 20 | 12 |
| `cover` | `accent` | 0,8 | 0.25 | 20 | 8 |

### 1.5 Border Radii

| Token | Value | Usage |
|---|---|---|
| `sm` | 6px | Badges |
| `md` | 10–12px | Cover thumbnails, small cards |
| `lg` | 14–16px | Tab pills, buttons |
| `xl` | 20px | Cards, settings rows container |
| `2xl` | 24–28px | Album cover in FullPlayer |
| `full` | 50px | Pill buttons (Play All, CTA) |
| `circle` | 50% | Avatars |

### 1.6 Component Library

**Interactive components:**
- `Button` — primary (accent fill, pill), secondary (surface fill, border), danger (coral text), disabled (opacity 0.5)
- `TabPill` — library tab with icon + label, active/inactive state
- `SegmentedControl` — auth screen phone/email tabs

**Track components:**
- `TrackRow` — cover (48px) + title + artist + right actions (like, index, duration, offline indicator)
- `TrackCard` — vertical card for grid layout (not yet built — needed Phase 6)
- `ChartRow` — TrackRow with position number + trend arrow

**Media components:**
- `ArtistCard` — circular avatar (80px) + name (not yet built — for horizontal scroll sections)
- `AlbumCard` — square cover (140px) + title + year (not yet built — for horizontal scroll sections)
- `PlaylistCard` — square cover (140px) + title + track count (not yet built — Phase 6)
- `ArtistRow` — artist inline row in Search (46px circular avatar + name + chevron)

**Player components:**
- `MiniPlayer` — progress line + cover (46px) + title + artist + play/next controls
- `FullPlayer` — full-screen modal with large cover + seek bar + controls + queue button
- `QueueSheet` — modal list of upcoming tracks

**Feedback components:**
- `EmptyState` — icon (48–56px) + title (h4) + hint (body2) + optional CTA button
- `SkeletonLoader` — animated shimmer placeholder variants
- `ErrorState` — icon + error message + retry button
- `LoadingDots` — inline loading indicator for search

**Navigation:**
- `TabBar` — 4 tabs (Home, Search, Library, Profile) with icon + label
- `MiniPlayer` — sits above tab bar, 66px height + progress line
- `BackButton` — icon button with hitSlop 8px on all sides

---

## 2. Screen Specs

### 2.1 Frame Dimensions

| Device | Width | Height | Safe Area Top | Safe Area Bottom | Tab Bar Height | MiniPlayer Height |
|---|---|---|---|---|---|---|
| iPhone 14 Pro | 390px | 844px | 59px | 34px | 83px | 66px | 
| iPhone SE 3 | 375px | 667px | 20px | 0px | 49px | 66px |
| Android mid-range | 412px | 915px | 24px | 0px | 56px | 66px |
| Android compact | 360px | 780px | 24px | 0px | 56px | 66px |

### 2.2 Layout Structure

```
┌─────────────────────────┐
│     Safe Area Top       │  (varies by device)
├─────────────────────────┤
│                         │
│     Screen Content      │  flex: 1, scrollable
│                         │
├─────────────────────────┤
│     MiniPlayer          │  66px (only when track is active)
├─────────────────────────┤
│     Tab Bar             │  49–83px depending on device
│     Safe Area Bottom    │
└─────────────────────────┘
```

Content bottom padding: 120px (accounts for MiniPlayer + TabBar + safe area)

### 2.3 Home Screen

**Frame:** 390×844 (iPhone 14 Pro primary)

| Zone | Y position | Height | Notes |
|---|---|---|---|
| Header (app name + greeting) | Safe area end | ~72px | paddingH: 24, paddingBottom: 20 |
| Chart section header | +0 | 44px | KZ badge + title + paddingH: 24 |
| Chart entries (×5) | +44 | 5×68px | ChartRow components |
| "Recommended" section header | dynamic | 47px | paddingH: 24, paddingT: 20 |
| Recommended tracks | dynamic | n×68px | TrackRow components |
| Catalog sections | dynamic | varies | Section header + tracks |

**States:**
- **Loading:** 6× SkeletonRow (46px cover + 2 text lines) with shimmer
- **Error:** centered icon + message + retry button
- **Empty (no sections, no chart):** currently missing — needs EmptyState component
- **Refreshing:** RefreshControl with copper `tintColor`

**Missing on screen:**
- No greeting personalization (shows generic "Привет", not "Привет, [name]")
- No horizontal scroll for AlbumCard/ArtistCard sections (only vertical TrackRow lists)
- No "Recently played" section

### 2.4 Library Screen

**Frame:** 390×844

| Zone | Y position | Height | Notes |
|---|---|---|---|
| Header "Библиотека" | Safe area end | ~50px | paddingH: 24 |
| Tab pills row | +50 | 52px | Liked + Offline pills, gap: 8, paddingH: 16 |
| Content area | +102 | flex 1 | LikedSection or OfflineSection |

**States per tab:**
- **Loading (Liked):** currently shows text only — needs SkeletonLoader
- **Error (Liked):** shows text + retry — adequate but missing icon
- **Empty (Liked):** heart icon + title + hint — good
- **Empty (Offline):** download icon + title + hint — good
- **Missing:** "Playlists" tab for Phase 6

### 2.5 Search Screen

**Frame:** 390×844

| Zone | Y | Height | Notes |
|---|---|---|---|
| Search input bar | Safe area end + 8 | 52px | borderRadius: 24, paddingH: 16 |
| Content area | +68 | flex 1 | states below |

**States:**
- **Idle (no query):** musical note icon + placeholder text — adequate but needs better visual
- **Loading:** plain text "Загрузка..." — needs skeleton rows or spinner
- **No results:** plain text only — needs icon
- **Results:** FlatList with section headers + TrackRow + ArtistRow
- **Error:** text + retry button — adequate

**Missing:**
- No recent searches history
- No genre/mood browse grid for idle state
- Loading state has no visual skeleton

### 2.6 Profile Screen

**Frame:** 390×844

| Zone | Y | Notes |
|---|---|---|
| Avatar (90×90px circle) + name + role | Top, centered | paddingTop: 32 |
| Language section | Below avatar | 3 language options |
| Offline storage section | Below language | Download count + clear button |
| Subscription section | Below offline | Upgrade prompt |
| Logout section | Below subscription | Destructive action |
| Version string | Bottom | centered, textMuted |

**Missing:**
- No "Edit profile" option (display name, avatar)
- Offline storage entry is hardcoded in Russian ("треков · МБ") — not i18n-safe
- No account info section (email/phone display)

### 2.7 Artist Page

**Frame:** 390×844

| Zone | Y | Notes |
|---|---|---|
| Back button | Safe area end + 4 | paddingH: 20 |
| Avatar (130×130 circle) | centered | +20 margin |
| Name + badges | center-aligned | KZ badge, verified checkmark |
| Artist type + bio (4 lines max) | center-aligned | |
| "Дискография" section title | left-aligned | |
| Release rows | paddingH: 16 | Cover 52px + title + meta + chevron |

**Hardcoded strings (not i18n):**
- "Дискография" (discography label)
- "Нет релизов" (no releases)
- RELEASE_TYPE_LABELS object values

**Missing:**
- No play-all / latest release shortcut
- No skeleton loading state (shows text only)
- Artist type shown as raw enum value (e.g. "SOLO_ARTIST")

### 2.8 Album Page

**Frame:** 390×844

| Zone | Y | Notes |
|---|---|---|
| Back button | Safe area end + 4 | |
| Album cover (200×200px) | centered | borderRadius: 20, accent glow shadow |
| Title + artist link + meta | centered | artist name is tappable → artist page |
| "Play All" button | centered | accent pill, play icon |
| Track list | below header | TrackRow components with index numbers |

**Hardcoded strings:**
- "Воспроизвести всё" (play all)
- "Нет треков" (no tracks)
- RELEASE_TYPE_LABELS values

### 2.9 Login Screen

**Frame:** 390×844

| Zone | Y | Notes |
|---|---|---|
| App name + subtitle | centered vertically | paddingH: 32 |
| Phone/Email tabs | below header | segmented control |
| Form fields | below tabs | varies by active tab |
| Primary CTA button | below form | accent pill |
| Secondary links | below CTA | register / forgot password |

**States:**
- **Phone step 1:** phone input + "Get code" button + register link
- **Phone step 2 (OTP):** code input (large, centered, letterSpacing: 8) + verify + resend
- **Email:** email + password inputs + login button + forgot + register
- **Loading:** ActivityIndicator inside button
- **Error:** inline `errorText` below inputs
- **Rate limited:** countdown timer in button text

---

## 3. Component Specs

### 3.1 EmptyState Component

**Purpose:** Full-area placeholder when a list or section has no content.

```
┌──────────────────────────────────┐
│                                  │
│                                  │  ~60px top padding
│         [Icon 48–56px]           │  Ionicons, color: textMuted
│                                  │
│         Title text               │  h4 (18px, w600), textSecondary
│                                  │  gap: 12
│    Subtitle / hint text          │  body2 (14px), textMuted, centered
│    paddingH: 32                  │  maxWidth: 260px
│                                  │
│    [Optional CTA Button]         │  secondary style, paddingH: 24, paddingV: 12
│                                  │  borderRadius: 20, gap: 16 below subtitle
└──────────────────────────────────┘
```

**Props:** `icon: IoniconName`, `title: string`, `subtitle?: string`, `ctaLabel?: string`, `onCta?: () => void`

**Variants:**
- `library-liked` — heart-outline icon, "Здесь пока пусто", "Лайкайте треки..."
- `library-offline` — arrow-down-circle-outline, "Нет скачанных треков", "Скачивайте в плеере..."
- `search-idle` — musical-notes icon, "Найдите трек или артиста"
- `search-empty` — search icon, "Ничего не найдено", "Попробуйте другой запрос"
- `artist-releases` — disc icon, "Нет релизов"
- `queue-empty` — list icon, "Очередь пуста"

### 3.2 SkeletonLoader Component

**Purpose:** Shimmer placeholder during data fetch. Uses Animated.Value cycling 0→1→0 on opacity or translateX.

**Shimmer animation:** `Animated.loop(Animated.sequence([opacity 0.4→0.8→0.4, duration 1200ms]))`

**TrackRowSkeleton:**
```
┌─────────────────────────────────────────────┐
│  [48×48 rect, r12]  [████████████  70%  ]   │  height: 12, r6, surfaceElevated
│                     [██████  45%         ]   │  height: 10, r5, surface
│  marginH: 16, paddingH: 16, paddingV: 10     │
│  backgroundColor: surfaceGlass, r20          │
└─────────────────────────────────────────────┘
```

**CardSkeleton (for future horizontal scroll):**
```
┌──────────────┐
│              │  140×140px, r14, surfaceElevated
│   cover      │
│              │
└──────────────┘
[████████  80%]   height: 12, r6, marginTop: 8
[████  50%    ]   height: 10, r5, marginTop: 4
```

**ArtistCardSkeleton (for future horizontal scroll):**
```
  ╭────╮   80×80px circle, surfaceElevated
  ╰────╯
[████████]   width: 80px, height: 10, r5, centered
```

**Usage:** Render 5–6 TrackRowSkeleton items during initial load in Liked tab, Search results.

### 3.3 PlaylistCard Component (Phase 6)

**Purpose:** Tappable card for playlists in horizontal scroll sections or grid.

```
┌──────────────────────┐
│                      │  140×140px, borderRadius: 14
│   cover image or     │  4-photo mosaic if no single cover
│   mosaic placeholder │
└──────────────────────┘
Playlist Title           body3 (14px, w600), textPrimary, numberOfLines: 1
x tracks                 caption2 (12px), textMuted
```

**Mosaic placeholder:** 4 small cover images in 2×2 grid, or music-note icon on surfaceElevated background.

**Props:** `playlist: { id, title, coverUrl?, trackCount, isOwned }`, `onPress: () => void`

### 3.4 ContextMenu / BottomSheet (Long-press actions)

**Purpose:** Action sheet triggered by long-press on TrackRow (currently uses native Alert — needs upgrade).

**Dimensions:** Modal bottom sheet, 280px min height, borderRadius 24px at top, surfaceGlass background with blur.

**Layout:**
```
───────── drag handle (40×4px, r2, border color) ──────────

  [cover 48px]  Track Title                        
                Artist Name                        
                
  ─────────────────────────────────────────────────
  [heart]  Добавить в «Мне нравится»
  [add]    Добавить в плейлист
  [disc]   Перейти к альбому
  [person] Перейти к артисту
  [share]  Поделиться
  ─────────────────────────────────────────────────
  [eye-off]   Скрыть этот трек
  [person-remove]  Скрыть артиста
```

Row height: 52px, paddingH: 20, icon size: 20px, body2 text.
Destructive actions (hide) separated by hairline border, textSecondary color.

---

## 4. Figma Frames Checklist

### Component Frames (one file, "Components" page)

- [ ] `Colors/Palette` — all COLORS tokens as swatches with hex values
- [ ] `Typography/Scale` — each type style with sample text
- [ ] `Spacing/Grid` — 4px grid illustration + all token values
- [ ] `Icons/Set` — all Ionicons used, 24px, organized by category
- [ ] `Button/Primary` — default, pressed, disabled, loading
- [ ] `Button/Secondary` — default, pressed, disabled
- [ ] `Button/Danger` — default, pressed
- [ ] `Button/Pill` — CTA pill (Play All, Login)
- [ ] `TabPill/Default` — inactive state
- [ ] `TabPill/Active` — active state with accentDim background
- [ ] `TrackRow/Default` — no active state
- [ ] `TrackRow/Active-Playing` — accentDim bg + animated bars (use static in Figma)
- [ ] `TrackRow/Active-Paused` — accentDim bg + paused bars
- [ ] `TrackRow/Disabled` — opacity 0.45, locked overlay
- [ ] `TrackRow/WithLike` — heart icon on right
- [ ] `ChartRow/Position1` — gold number, trophy
- [ ] `ChartRow/Position2-3` — accentLight number
- [ ] `ChartRow/WithTrend` — up/down caret icon
- [ ] `ArtistRow` — circular avatar + name + chevron
- [ ] `ArtistCard` — for horizontal scroll (future)
- [ ] `AlbumCard` — for horizontal scroll (future)
- [ ] `PlaylistCard` — Phase 6
- [ ] `MiniPlayer/Default`
- [ ] `MiniPlayer/Playing`
- [ ] `EmptyState/LibraryLiked`
- [ ] `EmptyState/LibraryOffline`
- [ ] `EmptyState/SearchIdle`
- [ ] `EmptyState/SearchNoResults`
- [ ] `EmptyState/ArtistNoReleases`
- [ ] `SkeletonLoader/TrackRowSkeleton`
- [ ] `SkeletonLoader/CardSkeleton`
- [ ] `ContextMenu/BottomSheet`

### Screen Frames (one frame per state, "Screens" page)

#### Home Screen (390×844)
- [ ] `Home/Loading` — 6× TrackRowSkeleton + header
- [ ] `Home/Default` — chart section + recommendations + catalog sections
- [ ] `Home/Error` — error state with retry
- [ ] `Home/Empty` — no sections returned (rare edge case)
- [ ] `Home/Default-PlayerActive` — with MiniPlayer visible

#### Library Screen (390×844)
- [ ] `Library/Liked-Loading` — 5× TrackRowSkeleton
- [ ] `Library/Liked-Empty` — EmptyState with heart icon
- [ ] `Library/Liked-Filled` — list of liked tracks
- [ ] `Library/Offline-Empty` — EmptyState with download icon
- [ ] `Library/Offline-Filled` — list of downloaded tracks

#### Search Screen (390×844)
- [ ] `Search/Idle` — empty state, musical notes icon
- [ ] `Search/Loading` — search bar filled + loading skeletons
- [ ] `Search/Results-Tracks` — tracks section results
- [ ] `Search/Results-TracksAndArtists` — both sections
- [ ] `Search/NoResults` — no matches state
- [ ] `Search/Error` — error + retry

#### Profile Screen (390×844)
- [ ] `Profile/Default` — all sections
- [ ] `Profile/LogoutConfirm` — Alert overlay (illustration only)

#### Artist Page (390×844)
- [ ] `Artist/Loading` — skeleton for header + releases
- [ ] `Artist/Default-WithReleases` — full artist header + release list
- [ ] `Artist/Default-NoReleases` — empty discography state
- [ ] `Artist/Error`

#### Album Page (390×844)
- [ ] `Album/Loading` — cover skeleton + track skeletons
- [ ] `Album/Default` — cover + info + play all + track list
- [ ] `Album/Error`

#### Login Screen (390×844)
- [ ] `Login/PhoneStep1` — phone input
- [ ] `Login/PhoneStep2-OTP` — code input (large digits)
- [ ] `Login/Email` — email + password inputs
- [ ] `Login/Loading` — spinner in button
- [ ] `Login/Error` — inline error message
- [ ] `Login/RateLimited` — countdown in button

#### FullPlayer (390×844)
- [ ] `FullPlayer/Default-Playing`
- [ ] `FullPlayer/Default-Paused`
- [ ] `FullPlayer/NoCover` — placeholder cover
- [ ] `FullPlayer/Liked` — heart filled

#### Queue Sheet (390×844 overlay)
- [ ] `QueueSheet/WithItems` — current + upcoming tracks
- [ ] `QueueSheet/Empty`

#### Flow overlays (412×915 Android reference)
- [ ] `Android/Home/Default` — verify layout at Android dimensions
- [ ] `Android/FullPlayer/Default`

---

## 5. UX Issues Found

### CRITICAL

**C1 — No skeleton loading in Library/Liked tab**
The LikedSection shows plain text "Загрузка..." during initial fetch. On a fresh open the screen flash-renders the loading text, then jumps to content. Should render 5× TrackRowSkeleton.
File: `mobile/app/(tabs)/library.tsx` lines 47–53

**C2 — Hardcoded Russian strings in Artist and Album pages**
`artist/[id].tsx` has "Дискография" and "Нет релизов" hardcoded. `album/[id].tsx` has "Воспроизвести всё" and "Нет треков" hardcoded. RELEASE_TYPE_LABELS is not i18n-aware. These break KK and EN locales silently.
Files: `mobile/app/artist/[id].tsx` lines 105–113, `mobile/app/album/[id].tsx` lines 122–124, 132

**C3 — Search loading state is a plain text label with no animation**
When the user types a query and waits for debounce + network, there is just "Загрузка..." centered on screen. This lacks visual feedback on whether the query was received.
File: `mobile/app/(tabs)/search.tsx` lines 102–107

**C4 — No MiniPlayer swipe-to-dismiss gesture**
The MiniPlayer is a plain TouchableOpacity — swiping down to dismiss the FullPlayer works (modal), but there is no swipe-up to open, and no dismiss swipe on the MiniPlayer itself. This is a core mobile music app interaction expectation.
File: `mobile/components/player/MiniPlayer.tsx`

**C5 — Profile screen offline storage label is not i18n-safe**
Line 172: `` `${downloadedEntries.length} треков · ${totalMb} МБ` `` — hardcoded Russian "треков" and "МБ". Will display incorrectly in KK and EN locales.
File: `mobile/app/(tabs)/profile.tsx` line ~85

### IMPORTANT

**I1 — Artist page: no loading skeleton**
During fetch, the artist page shows the back button + blank space + tiny "Загрузка..." text at center. Should render a skeleton matching the header layout (circle placeholder + two text lines + release list skeletons).
File: `mobile/app/artist/[id].tsx` lines 50–54

**I2 — Album page: no loading skeleton**
Same issue as I1 for album page. Cover + meta + track list all blank until data arrives.
File: `mobile/app/album/[id].tsx` lines 62–66

**I3 — Error state on Artist/Album pages lacks retry button**
Both pages show "Ошибка" text but no retry/refetch button. Users have no recovery path without navigating away and back.
Files: `mobile/app/artist/[id].tsx` line 59, `mobile/app/album/[id].tsx` line 69

**I4 — No playlist functionality in mobile**
CLAUDE.md lists playlists module as done in backend, but there is no playlist tab in Library and no "Add to playlist" action in TrackRow long-press context menu. Library feels incomplete.

**I5 — Search idle state uses placeholder copy as empty state title**
`t('search.placeholder')` ("Исполнители, треки, альбомы") is shown as the idle state heading. This is input hint copy, not an invitation message. Should be a separate i18n key.
File: `mobile/app/(tabs)/search.tsx` line 97

**I6 — FullPlayer seek bar hit area is only 4px tall**
The seekTrack View is `height: 4`. While panHandlers are attached, the touch target is very small, especially for vertical scrolling interference. Should be at minimum 44px touch area with visual track at 4px inside.
File: `mobile/components/player/FullPlayer.tsx` line ~184

**I7 — Artist type displays as raw enum**
`artist.type` is rendered directly (e.g. "SOLO_ARTIST", "BAND") without label mapping or i18n.
File: `mobile/app/artist/[id].tsx` line 98

**I8 — No "Play all" from Artist page**
Artist page shows releases list but no shortcut to play the latest/popular release. Album page has play-all but artist page requires an extra navigation step.

**I9 — Library loading state missing accessibility label**
The loading text and empty states lack `accessibilityRole` and `accessibilityLabel` props. Screen readers cannot convey these states.

**I10 — Home screen app title uses auth.title key**
`t('auth.title')` ("MoodStream") is used as the home screen header text — this couples auth i18n namespace with home screen display. Should use a dedicated key or constant.
File: `mobile/app/(tabs)/index.tsx` line 215 (loading state) and line 291

### NICE TO HAVE

**N1 — No horizontal scroll for albums/artists in Home**
Home screen sections only show TrackRow lists. A horizontal scroll of AlbumCard components would be more engaging for "New KZ" and "Popular" sections, matching standard streaming app patterns.

**N2 — Artist bio truncated with no "Read more" toggle**
Bio is capped at 4 lines with no expansion. For artists with long bios this cuts important context.
File: `mobile/app/artist/[id].tsx` line 101

**N3 — No share button on tracks / artist / album pages**
A share sheet is a basic discovery mechanism and is entirely absent.

**N4 — MiniPlayer has no track number / queue position indicator**
Users can't tell "track 3 of 12" without opening the queue.

**N5 — No recently played section**
The Home screen shows recommendations and catalog sections but no "Recently played" row — useful for re-finding a track heard earlier in the session.

**N6 — No album art color extraction for dynamic theming**
FullPlayer cover glow is always `accent (#C87B4E)` regardless of album art. Dynamic color extraction from cover image would significantly improve the visual premium feel.

**N7 — Queue sheet does not distinguish "playing now" from "up next"**
The current track and upcoming tracks are shown in a continuous list. A section separator ("Now Playing" / "Up Next") would improve clarity.
File: `mobile/components/player/QueueSheet.tsx`

**N8 — No haptic feedback on play/pause, like, seek**
Haptic feedback (light impact on play, medium on like) is an expected interaction pattern on both iOS and Android that is entirely missing.

**N9 — No track release year / album name in search results**
TrackRow shows title + artist but not album name. In search context, disambiguating between two versions of the same song (studio vs. live) requires the album name.

**N10 — No empty state for Home when API returns no sections**
If the backend returns an empty sections array and the chart also fails, the Home screen shows just the header and a pull-to-refresh — no illustration or guidance.
