---
tags: [report, recommendations, ml, research, competitive-analysis]
date: 2026-04-07
type: research-report
---

# Music Recommendation Systems — Competitive Analysis & MoodStream Strategy

## Executive Summary

Music recommendation has become the primary battleground for streaming retention. Spotify's Discover Weekly proved that algorithmic curation can drive more engagement than editorial. Yet every major platform suffers a common blind spot: they optimize for global scale at the cost of local relevance, and they hide their reasoning to protect algorithmic IP at the cost of user trust.

MoodStream KZ has a structural opportunity: build a recommendation layer that is simultaneously more locally relevant (Kazakhstan-first library), more transparent (user sees why), and more controllable (user adjusts weights) than any competitor. This report documents what each major platform does, what they get wrong, and proposes four algorithm variants plus a hybrid meta-ranker tuned for MoodStream's constraints and principles.

---

## Competitor Analysis

### Spotify

**Core algorithm type:** Hybrid — matrix factorization (collaborative filtering) + NLP on playlist context + audio features (legacy Echo Nest) + contextual bandits (BaRT)

**Key signals:**
- Implicit feedback: streams > 30s, stream completions, seeks, skips
- Explicit feedback: likes, saves, playlist adds, follows
- Playlist co-occurrence: if tracks appear in similar playlists, they are treated as acoustically or culturally adjacent
- NLP on playlist titles ("chill vibes 2am", "gym pump") to derive mood/genre embeddings without labeled data
- Audio features: BPM, energy, valence, danceability, key, mode, loudness, speechiness (Echo Nest pipeline, now internal)
- BaRT (Bandits for Recommendations as Treatments): online learning that treats each recommendation slot as an exploration/exploitation tradeoff — reduces cold-start problem at the cost of short-term engagement

**Two-tower neural network (current):**
- User tower: embeds listening history + demographics + context into a dense vector
- Item tower: embeds track audio features + metadata + co-occurrence stats into a dense vector
- Dot product at serving time enables fast ANN (approximate nearest neighbor) retrieval over 100M+ tracks
- Trained offline, updated daily; online serving via FAISS or similar

**Transparency level:** Black box. "Because you listened to X" is a post-hoc rationalization retrieved separately from the ranking model. The actual score is never shown. Users cannot adjust weights.

**Weaknesses:**
- Popularity bias: top 0.1% of catalog gets the majority of recommendation exposure
- Filter bubble: the model reinforces existing taste rather than expanding it
- New artist discovery in non-English markets is severely limited — NLP is English-centric
- KZ/CIS catalog is sparse; cold start for Kazakh artists is brutal because there is no playlist co-occurrence signal
- Explicit feedback (dislike) has weak effect on the model — users report repeated unwanted tracks

**What MoodStream should learn:** Two-tower architecture for fast retrieval. BaRT-style exploration to avoid bubble reinforcement. Playlist co-occurrence as a cheap proxy for acoustic similarity.

**What MoodStream can beat:** Transparency (Spotify hides everything). Local artist surfacing. Responsive explicit feedback (user hides a track → it is gone immediately, not deprioritized by 5%).

---

### Apple Music

**Core algorithm type:** Hybrid editorial + ML. Human editors ("music experts") curate playlists; ML personalizes which curated playlists are surfaced and in what order. "For You" section uses listen history weighting.

**Key signals:**
- Music library additions (strong signal — user committed)
- Listen history with time-decay weighting (recent listens weighted higher)
- Editorial genre tags + mood tags applied by human curators
- Siri intent signals (when available, cross-device)
- Purchase history (legacy iTunes DNA)

**Transparency level:** Medium. Apple shows playlist categories ("For You", "New Music Mix") but does not explain individual track rankings. The editorial curation layer adds implicit explainability ("curated for rock fans") but personal ranking is opaque.

**Weaknesses:**
- Heavy editorial dependency makes it expensive to scale to niche markets — Kazakhstan has minimal Apple Music editorial investment
- No audio feature analysis comparable to Spotify's Echo Nest data
- Cold start for new users without library history is poor
- Android UX is second-class, which matters in KZ where Android dominates

**What MoodStream should learn:** Library add as a high-confidence signal — users who save tracks are showing intent, not just passive listening. Editorial curation as a trust layer (even if small-scale KZ editorial).

**What MoodStream can beat:** Local market investment. Android-first quality. New user experience without requiring a legacy library.

---

### YouTube Music

**Core algorithm type:** Sequence models (transformer-based) on watch/listen sessions + search intent signals. Heavily influenced by YouTube's video recommendation architecture (Multi-gate Mixture-of-Experts, MMoE).

**Key signals:**
- Session sequence: what the user listened to in the last N tracks in this session
- Search queries: typed search terms reveal explicit intent not present in passive listening
- Watch-to-listen conversion: users who come from YouTube video clips carry strong genre/mood context
- Skip timing: early skip vs late skip vs completion — skip at 10s means different signal than skip at 2:45
- Collaborative filtering on session co-occurrence (not user similarity)

**Transparency level:** Low. "Recommended for you" with no further explanation. Session context is the implicit rationale but never surfaced.

**Weaknesses:**
- Video-first design creates awkward UX for pure music listening
- Session models require active session data — new session = cold restart
- Algorithm conflates music taste with video content preferences, causing category bleed
- KZ content is indexed but not curated; local artist discovery is essentially zero

**What MoodStream should learn:** Skip timing precision (skip at 10s vs 2:45 is very different information). Session-aware context: the current session sequence predicts next track better than historical preference alone.

**What MoodStream can beat:** Audio-only focus. Session that carries context between app opens (not resetting on every launch). KZ-specific session patterns.

---

### VK Music

**Core algorithm type:** Collaborative filtering + social graph signals + Russian/CIS NLP. Tight integration with VK social network provides social proof signals unavailable to other platforms.

**Key signals:**
- Social graph: friends' listening activity (with consent) is a strong regional signal
- Group membership: VK music groups indicate genre/subculture affiliation
- Russian-language NLP: artist/track/album names are parsed with Cyrillic-aware models
- CIS regional charts: separate popularity rankings for Russia, Kazakhstan, Ukraine
- Audio fingerprinting for duplicate detection (relevant for UGC-heavy catalog)

**Transparency level:** Low. "Your friends are listening to X" is the only visible social signal. Algorithmic ranking is opaque.

**Weaknesses:**
- Social graph signals are only useful for users with active VK social presence — cold for new users or users who don't use VK socially
- Content licensing in Kazakhstan is inconsistent — some tracks play only in Russia
- Algorithm is optimized for Russian taste; Kazakh-language content is underweighted
- Privacy concerns around social listening data

**What MoodStream should learn:** Regional chart separation (Almaty vs Astana vs regional KZ). Cyrillic/Kazakh NLP pipeline. Social proof without requiring social network — anonymous cohort signals instead of friend graphs.

**What MoodStream can beat:** Kazakh-language content depth. Privacy-respecting social signals. Geo-aware availability transparency.

---

### Deezer

**Core algorithm type:** Flow algorithm — hybrid mood detection + CF. Deezer's Spleeter (open-sourced audio separation tool) enables stem-level audio feature extraction. Mood tagging is more granular than most competitors.

**Key signals:**
- Mood tags: 7+ mood dimensions derived from audio analysis (energy, positivity, aggressiveness, acoustic character)
- Time-of-day personalization: Flow explicitly adjusts mood profile by time (morning energetic, evening chill)
- Spleeter-derived features: separate vocals from instruments for better genre/mood classification
- User-editable mood preferences: Flow settings allow explicit mood biasing (rare transparency)

**Transparency level:** Medium-high. Flow shows mood profile and time-of-day adaptation. Users can adjust mood sliders — closest competitor to MoodStream's "control-first" principle.

**Weaknesses:**
- Market presence in KZ is negligible — no local catalog investment
- Spleeter-level audio analysis requires significant compute; not trivial to replicate
- Mood categories are still coarse (7 dimensions) vs the nuance of actual listening context
- Cold start for new users without audio history relies on onboarding questionnaire, which has low completion rates

**What MoodStream should learn:** Time-of-day mood profiling. User-adjustable mood sliders as a transparency mechanism. Audio separation for richer feature extraction.

**What MoodStream can beat:** KZ market presence. Deeper local artist knowledge. Real-time explicit feedback responsiveness.

---

### Yandex Music

**Core algorithm type:** Hybrid — Russian NLP + artist similarity graph + "Wave" contextual radio + mood tags. Strongest Russian-language NLP of any streaming platform, with direct relevance to KZ Russian-speaking market.

**Key signals:**
- Russian/CIS NLP: genre, mood, and artist description parsing in Russian
- "Wave" radio: seed track or artist → similarity graph traversal + context injection
- Mood tags: explicit mood labels curated by editors + ML-derived
- Listening velocity: how fast user skips through tracks in a session (energy preference signal)
- Artist graph: hand-curated similarity relationships between artists (stronger than pure CF for niche artists)
- "Моя волна" (My Wave): personalized radio that blends liked tracks, similar artists, and editorial picks

**Transparency level:** Medium. "My Wave" explains itself as a blend of your taste + similar artists. Individual track reasons are not shown. Artist similarity graph is partially visible via "Similar artists" section.

**Weaknesses:**
- Kazakh-language content is treated as a subset of Russian content — transliteration and language detection errors for Kazakh text
- Artist graph is manually curated, creating bottlenecks for new artists
- Wave radio can loop similar content — limited exploration
- Mobile app performance on Android mid-range (dominant in KZ) is inconsistent

**What MoodStream should learn:** Artist similarity graph as a complement to pure CF — especially valuable for niche KZ artists with low play counts. "Wave" mode as a named, branded feature (not just "radio"). Listening velocity as an energy preference signal.

**What MoodStream can beat:** Kazakh-language NLP. New KZ artist surfacing without requiring high play counts. Android performance on KZ-typical hardware.

---

### Last.fm (Historical Reference)

**Core algorithm type:** Tag-based collaborative filtering + passive scrobbling. Last.fm (2002–present) is the original recommendation research dataset and represents the most documented approach to taste profiling via explicit event tracking.

**Key signals:**
- Scrobbles: every track play is recorded with timestamp, artist, track, album — the most granular listening history dataset ever assembled for music
- User-generated tags: free-form labels ("shoegaze", "feels like rain", "2am drive") crowdsourced at scale, creating a dense semantic graph
- Neighbor-based CF: users with similar scrobble histories are neighbors; their top unheard artists become recommendations
- Artist similarity: computed from co-scrobbler overlap — if 80% of Radiohead listeners also scrobble Portishead, they are similar regardless of audio properties
- "Love" and "ban" explicit feedback — strong signals, but rare (users seldom rate)

**Transparency level:** High (historically). Last.fm showed your "similar users" and the explicit neighbor logic. Modern Last.fm is less transparent after CBS Interactive ownership, but the original model was genuinely interpretable.

**Weaknesses:**
- Requires scrobble volume to work — new users and artists in niche markets (KZ) had cold-start problems
- Tag quality varies; popular tags cluster around English-language genre conventions
- No audio analysis — purely behavioral and user-generated
- Does not handle offline listening

**What MoodStream should learn (critical lesson):** Passive event tracking at maximum granularity is the foundation of every recommendation system. Last.fm proved that users will accept tracking if the value exchange is clear ("we show you your stats and give you better discovery"). MoodStream's play event schema should capture: `track_id, user_id, started_at, ended_at, skip_position_ms, source (search|recommendation|chart|library), context_time_of_day, offline_flag`. This dataset — even at 100K users — will be more valuable for KZ music than anything a global platform has.

**What MoodStream can beat:** Last.fm's tag system requires critical mass. MoodStream can replace it with structured genre/mood tags applied at ingestion (admin + AI) and surfaced for user confirmation — lower friction, higher quality signal.

---

## Key Insights from Competitors

1. **No competitor has invested in Kazakhstan or Kazakh-language NLP.** VK and Yandex have CIS coverage but treat Kazakhstan as a subset of Russian market. Apple and Spotify have negligible KZ editorial. This is the primary structural gap MoodStream can own.

2. **Transparency is universally poor.** Deezer's Flow is the closest to explainable recommendations, but still doesn't show per-track score components. No competitor lets users tune algorithmic weights. This is MoodStream's clearest product differentiation.

3. **Cold start is everyone's weakness.** All platforms struggle with new users and new artists. Audio feature similarity (Variant B below) is the best cold-start solution because it requires no behavioral data.

4. **Skip timing is underused.** YouTube Music tracks it but doesn't expose it. Skip at 10 seconds versus skip at 2:45 carries fundamentally different information about why the track failed.

5. **Session context beats history for in-the-moment recommendations.** What you're listening to right now predicts next track better than what you listened to last week. Sequence models (Variant D) capture this.

6. **Social proof without social network is possible.** Anonymous cohort clustering ("listeners like you in Almaty") delivers social validation without privacy cost.

7. **Last.fm's scrobble principle is timeless.** Passive, granular, timestamped play events are the single most valuable dataset any streaming service can accumulate. Every competitor captures this; MoodStream must too from day one.

8. **Deezer is the closest to "control-first" but stops short.** Flow mood sliders are a UX precedent MoodStream should acknowledge and exceed. The differentiator: Deezer's sliders are global mood controls; MoodStream's should be per-signal weights with named reasons.

---

## Competitor Comparison Matrix

| Platform | CF | Audio | NLP | Editorial | Session | KZ Coverage | Transparency | Cold Start |
|----------|----|----|-----|-----------|---------|-------------|--------------|------------|
| Spotify | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★★☆☆☆ |
| Apple Music | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★★★ | ★★☆☆☆ | ★☆☆☆☆ | ★★☆☆☆ | ★★☆☆☆ |
| YouTube Music | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ | ★☆☆☆☆ | ★★★★☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★★★☆☆ |
| VK Music | ★★★★☆ | ★★☆☆☆ | ★★★★☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ |
| Deezer | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ | ★☆☆☆☆ | ★★★★☆ | ★★★☆☆ |
| Yandex Music | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ |
| Last.fm | ★★★★☆ | ★☆☆☆☆ | ★★★☆☆ | ★☆☆☆☆ | ★★☆☆☆ | ★☆☆☆☆ | ★★★★☆ | ★☆☆☆☆ |
| **MoodStream target** | **★★★☆☆** | **★★★★☆** | **★★★★☆** | **★★★☆☆** | **★★★★☆** | **★★★★★** | **★★★★★** | **★★★★☆** |

*Stars represent depth/investment in that dimension, not overall product quality.*

---

## MoodStream Recommendation Variants

### Variant A: Transparency-First (MoodStream Signature)

**Philosophy:** Every recommendation has a named, weighted reason. The user sees the score decomposition and can adjust sliders to shift the algorithm's behavior.

**Scoring formula:**

```
scoreA(track) =
  w1 * likedArtistBoost(track) +       // artist in user's liked/saved
  w2 * genreAffinityScore(track) +     // user's genre distribution match
  w3 * recentSessionSimilarity(track)+ // cosine sim to last N played tracks
  w4 * libraryDiversityBonus(track) +  // penalize tracks too similar to already-saved
  w5 * kzBoost(track) +                // KZ origin bonus (configurable by user)
  w6 * freshnessBoost(track)           // recency of release, weighted by user setting
```

Weights `w1..w6` are user-visible and adjustable via slider UI. Default weights are learned from cohort behavior but overridable.

**Reason chain example (shown in UI):**
- "Because you like Ninety One (w1=0.4)"
- "Matches your pop/electronic preference (w2=0.3)"
- "Sounds like your recent session (w3=0.2)"
- "New KZ release (w5+w6=0.1)"

**Required data inputs:**
- User's liked tracks, saved tracks, artist follows
- Genre/mood tags on tracks (from ingestion pipeline)
- Play history with completion rates
- Track release date, origin country

**Cold start strategy:** New users see top-weighted KZ tracks + globally popular tracks. Onboarding taste picker (5 genre cards) seeds initial weights. After 10 plays, behavioral weights replace onboarding seeds.

**Implementation complexity:** Medium. Formula is straightforward; the UI for weight display and sliders adds frontend complexity. No ML training required — pure weighted scoring.

**Unique advantage vs competitors:** No competitor shows this level of scoring transparency. Users who distrust black-box algorithms (a growing segment) will choose MoodStream specifically for this feature.

---

### Variant B: Acoustic DNA

**Philosophy:** Recommend based on how a track sounds, not who listened to it. Solves cold start completely — a new track with zero plays can still be recommended if its audio profile matches the user's taste.

**Audio feature vector (per track):**
```
audioVector = [
  bpm_normalized,         // 0..1, normalized against library distribution
  energy,                 // 0..1 (RMS loudness proxy)
  valence,                // 0..1 (happy vs sad)
  danceability,           // 0..1
  acousticness,           // 0..1
  instrumentalness,       // 0..1
  speechiness,            // 0..1
  key_encoded,            // one-hot or cyclic encoding of musical key
  mode,                   // 0=minor, 1=major
  tempo_stability         // variance of beat interval
]
```

**User taste vector:** running weighted average of audio vectors of liked/completed tracks, with exponential decay on older plays.

**Scoring:**
```
scoreB(track) = cosine_similarity(userTasteVector, track.audioVector)
```

**Storage:** pgvector extension on PostgreSQL. `CREATE INDEX ON tracks USING ivfflat (audio_vector vector_cosine_ops)`. Cosine ANN query returns top-K candidates in ~10ms for 100K tracks.

**Cold start strategy:** No behavioral cold start — works from first track. New users inherit genre-cluster centroid vectors from onboarding selection.

**Implementation complexity:** Medium. Requires audio analysis pipeline in ingestion (BPM, energy extraction via ffmpeg + librosa-equivalent in Node.js, or a Python microservice). pgvector is a PostgreSQL extension, straightforward to add.

**Unique advantage vs competitors:** New KZ artists get recommended immediately upon ingestion, before they accumulate play counts. This is structurally impossible with pure CF systems. Directly supports MoodStream's "local artist visibility" principle.

---

### Variant C: Social Proof KZ

**Philosophy:** Leverage regional listening patterns as a social signal without requiring a social network. Anonymous cohort clustering delivers "people like you in Almaty" without exposing individual user data.

**Components:**

**1. Regional trending score:**
```
regionalScore(track, region) =
  playCount(track, region, last_7d) / totalPlays(region, last_7d)
  * regionalDecay(track, region)   // penalize tracks that peaked > 3d ago
```
Regions: Almaty, Astana, Shymkent, Karaganda, other_KZ, diaspora_KZ.

**2. Cohort clustering:**
- K-means on user behavior vectors (genre distribution + listening time patterns + device type)
- Clusters updated weekly via BullMQ background job
- Each user assigned a `cohortId`; track scores per cohort computed as aggregate play/skip ratios

**3. KZ underground boost:**
```
undergroundBoost(track) =
  kzOriginFlag * (1 / log(1 + globalPlayCount))
  * min(recentMomentum, 3.0)  // cap momentum multiplier at 3x
```
Where `recentMomentum = playCount_last_7d / playCount_prev_7d`. New KZ tracks with growing play counts get boosted before they reach chart scale.

**scoreC(track, user) = α * regionalScore + β * cohortScore + γ * undergroundBoost**

**Required data inputs:** Play events with region tag, user cohort assignment, track origin flag.

**Cold start strategy:** New users are assigned to a provisional cohort based on onboarding (region + age + genre picks). Cohort reassignment after 20 plays.

**Implementation complexity:** Medium. K-means clustering is trivial at MoodStream's initial scale (<100K users). Redis sorted sets for regional trending scores. BullMQ job for weekly cohort refresh.

**Unique advantage vs competitors:** No competitor has KZ-region-level trending. "Trending in Almaty right now" is a discoverable, shareable feature that drives social sharing — without requiring a social graph.

---

### Variant D: Session-Aware Contextual

**Philosophy:** The current session's context (time, sequence, behavior) is a stronger signal than historical preference for in-the-moment recommendations. Adapt in real time to what the user is doing right now.

**Context signals:**
```
context = {
  timeOfDay: "morning" | "afternoon" | "evening" | "night",
  dayOfWeek: 0..6,
  sessionLength: number,          // tracks played this session
  recentSkipRate: float,          // skips in last 5 tracks (0..1)
  avgCompletionRate: float,       // completions in last 5 tracks
  lastTrackEnergy: float,         // energy of last completed track
  connectivityStatus: "online" | "offline",
  batteryLevel: float             // from device API
}
```

**Time-of-day energy profile (learned per user, defaulted from cohort):**
```
targetEnergy(context) =
  timeProfile[context.timeOfDay] *       // user's typical energy by time
  dayProfile[context.dayOfWeek] *        // weekend vs weekday adjustment
  skimAdjust(context.recentSkipRate)     // if skipping a lot → change energy
```

**Sequential similarity:** Last 3 played tracks form a "session fingerprint." Recommend tracks whose audio vector is within `cosine_sim > 0.7` of the session fingerprint centroid, but with energy trending in the `targetEnergy` direction.

**Offline-first fallback:** If `connectivityStatus == "offline"`, score restricted to downloaded tracks. Battery < 20% → deprioritize tracks requiring high seek frequency (long tracks, complex queue operations).

**scoreD(track, context) =**
```
  energyMatch(track.energy, targetEnergy(context)) * 0.4 +
  sessionFingerprint(track, recentTracks) * 0.35 +
  timePatternScore(track, context.timeOfDay) * 0.15 +
  offlinePriority(track, context.connectivityStatus) * 0.10
```

**Required data inputs:** Play events with timestamps, skip events with skip_position_seconds, audio feature vectors, device context (from mobile API).

**Cold start strategy:** New users use cohort-derived time profiles. After 3 sessions (~30 tracks), personal time profile is statistically meaningful.

**Implementation complexity:** High. Sequence modeling at scale requires stateful session management in Redis. Time profiles require per-user time-series aggregation. However, the rule-based version (without deep sequence models) is Low complexity and delivers 80% of the value.

**Unique advantage vs competitors:** Offline-first adaptation is unique — no competitor adjusts recommendations based on connectivity status or cached content availability. This directly supports MoodStream's "offline-first" architecture principle.

---

## Hybrid Meta-Ranker

### Combining All Four Variants

```
finalScore(track, user, context) =
  α(user) * scoreA +   // transparency / explicit preference
  β(user) * scoreB +   // acoustic DNA
  γ(user) * scoreC +   // social proof KZ
  δ(user) * scoreD     // session-aware contextual

// constraint: α + β + γ + δ = 1.0
```

### Adaptive Weight Rules

**By user tenure:**
```
if userPlays < 20:
  β = 0.50, γ = 0.30, δ = 0.15, α = 0.05  // acoustic + social dominant
elif userPlays < 200:
  β = 0.35, γ = 0.25, δ = 0.20, α = 0.20  // balanced
else:
  β = 0.25, γ = 0.20, δ = 0.20, α = 0.35  // transparency dominant
```

**By time of day:**
```
if context.timeOfDay in ["morning", "afternoon"]:
  δ += 0.10, β -= 0.10   // session context more relevant during active hours
if context.timeOfDay == "night":
  α += 0.10, γ -= 0.10   // personal preference over social at night
```

**By recent behavior pattern:**
```
if recentLibraryAddRate > 0.3:   // user is in curation mode
  α += 0.15, δ -= 0.15          // explicit preference more relevant
if recentSkipRate > 0.5:         // user is searching for something
  δ += 0.20, α -= 0.20          // session context dominant
```

**By KZ content ratio preference (user-set):**
```
kzBoostMultiplier = 1.0 + (userKzPreference - 0.5) * 0.4
// userKzPreference in [0..1], set in profile settings
// kzBoostMultiplier ranges from 0.8 to 1.2
scoreC *= kzBoostMultiplier
```

### Candidate Generation → Ranking Pipeline

```
1. CANDIDATE GENERATION (fast, low-precision):
   - ANN query on pgvector: top 200 by acoustic similarity (Variant B)
   - Redis sorted set lookup: top 100 regional trending (Variant C)
   - Session fingerprint match: top 50 from current session context (Variant D)
   - User explicit preference query: top 50 by artist/genre affinity (Variant A)
   → union = ~300-400 unique candidates

2. RANKING (slower, high-precision):
   - Compute all 4 scores for each candidate
   - Apply adaptive α/β/γ/δ weights
   - Apply diversity penalty: reduce score for tracks too similar to already-recommended (MMR)
   - Apply explicit feedback: score = 0 for hidden tracks/artists
   → return top 20 ranked tracks

3. EXPLANATION GENERATION (async, for UI):
   - For top 5 tracks: retrieve dominant score component
   - Format as human-readable reason string
   - Cache in Redis for 10 minutes
```

---

## Implementation Roadmap

| Phase | What | Complexity | Value |
|-------|------|------------|-------|
| **Now (Phase 6)** | Variant A (rule-based, no ML) | Low | High — immediate transparency differentiator |
| **Now (Phase 6)** | Variant C regional trending via play events | Low | High — KZ charts are already partially built |
| **Phase 7** | pgvector + audio feature extraction in ingestion pipeline | Medium | High — enables Variant B cold start |
| **Phase 7** | Variant D rule-based (time profiles, skip signals) | Medium | Medium — improves session quality |
| **Phase 8** | Cohort clustering (K-means on BullMQ) | Medium | Medium — improves Variant C |
| **Phase 9** | Meta-ranker with adaptive weights | Medium | High — combines all signals |
| **Phase 10** | Two-tower neural network (if scale justifies) | High | Medium — only needed at >500K users |

**Audio feature extraction practical path for Node.js/BullMQ stack:**
- Use `music-metadata` (already in backend) for BPM, key, duration
- Spawn Python subprocess via BullMQ worker for energy/valence using `librosa` or `essentia`
- Or: use external API (AcousticBrainz data if available, or ACRCloud) for initial catalog
- Store as `float4[]` vector in PostgreSQL via pgvector extension

---

## Data Schema Requirements for Recommendation System

The recommendation variants described above require specific data captured from day one. Below are the minimum schema additions to support the full hybrid meta-ranker.

### Play Event Schema (critical)

```typescript
// backend/src/modules/player/play-event.schema.ts
interface PlayEvent {
  id:                 bigint;           // cursor-friendly BigInt
  userId:             string;
  trackId:            string;
  startedAt:          Date;
  endedAt:            Date | null;      // null if session crashed
  durationListenedMs: number;           // actual ms heard (excludes seek-ahead)
  skipPositionMs:     number | null;    // null = completed; position = skip point
  source:             PlayEventSource;  // enum below
  contextTimeOfDay:   TimeOfDayBucket;  // 'morning'|'afternoon'|'evening'|'night'
  contextDayOfWeek:   number;           // 0=Sun..6=Sat
  offlineFlag:        boolean;
  regionCode:         string | null;    // 'ALM'|'AST'|'SHY'|'KRG'|'OTHER_KZ'
  sessionId:          string;           // groups tracks in one listening session
  positionInSession:  number;           // which track # in this session
}

enum PlayEventSource {
  RECOMMENDATION = 'RECOMMENDATION',
  SEARCH         = 'SEARCH',
  CHART          = 'CHART',
  LIBRARY        = 'LIBRARY',
  ARTIST_PAGE    = 'ARTIST_PAGE',
  ALBUM_PAGE     = 'ALBUM_PAGE',
  PLAYLIST       = 'PLAYLIST',
  DIRECT         = 'DIRECT'   // user typed URL or deep link
}
```

**Why `source` matters:** Recommendation quality metrics require knowing which plays originated from recommendations vs. user-directed discovery. Without this, you cannot compute recommendation CTR, skip rate by source, or A/B test variants.

**Why `skipPositionMs` matters:** Skip at 5s = track was wrong genre/energy match. Skip at 2:45 of a 3:00 track = nearly completed, weak negative signal. Skip at 0:30 on a known track = user changed their mind about this session, not the track. These are fundamentally different signals.

### Track Audio Feature Schema

```sql
-- Add to tracks table via migration
ALTER TABLE tracks ADD COLUMN audio_vector vector(10);  -- pgvector

-- Index for ANN queries
CREATE INDEX tracks_audio_vector_idx
  ON tracks USING ivfflat (audio_vector vector_cosine_ops)
  WITH (lists = 100);  -- tune lists to sqrt(n_tracks)

-- Audio feature breakdown (for transparency UI)
ALTER TABLE tracks ADD COLUMN audio_features jsonb;
-- Example value:
-- {
--   "bpm": 128.4,
--   "energy": 0.82,
--   "valence": 0.61,
--   "danceability": 0.74,
--   "acousticness": 0.12,
--   "instrumentalness": 0.03,
--   "speechiness": 0.08,
--   "key": 5,
--   "mode": 1,
--   "loudnessDb": -6.2,
--   "analyzedAt": "2026-04-07T00:00:00Z",
--   "analyzerVersion": "1.0"
-- }
```

### User Recommendation Profile Schema

```sql
-- Stores derived preference state, updated by BullMQ job after each play event batch
CREATE TABLE user_recommendation_profiles (
  user_id              TEXT PRIMARY KEY REFERENCES users(id),
  taste_vector         vector(10),          -- running avg of liked track audio vectors
  genre_weights        jsonb,               -- { "pop": 0.4, "electronic": 0.3, ... }
  time_energy_profile  jsonb,               -- { "morning": 0.7, "evening": 0.3, ... }
  cohort_id            TEXT,                -- assigned weekly by K-means job
  region_code          TEXT,
  kz_preference        FLOAT DEFAULT 0.5,  -- user-set KZ content weight [0..1]
  explicit_weights     jsonb,               -- Variant A slider values
  hidden_track_ids     TEXT[],              -- immediate exclusion list
  hidden_artist_ids    TEXT[],
  total_plays          INTEGER DEFAULT 0,
  updated_at           TIMESTAMP DEFAULT NOW()
);
```

### Recommendation Explanation Cache Schema

```sql
-- Redis structure (not SQL) — cached explanations per user
-- Key: rec:explanation:{userId}:{trackId}
-- TTL: 10 minutes
-- Value:
{
  "scoreComponents": {
    "transparencyScore": 0.34,
    "acousticScore": 0.28,
    "socialScore": 0.22,
    "sessionScore": 0.16
  },
  "dominantReason": "LIKED_ARTIST",
  "humanReason": {
    "kk": "Сіз Ninety One тыңдайсыз",
    "ru": "Потому что вы слушаете Ninety One",
    "en": "Because you listen to Ninety One"
  },
  "secondaryReason": {
    "kk": "Алматыда трендте",
    "ru": "В тренде в Алматы",
    "en": "Trending in Almaty"
  }
}
```

The i18n on reason strings is critical — reason chains must be localized to kk/ru/en matching the user's interface language.

---

## Anti-Patterns to Avoid

These are failure modes well-documented in recommendation research that MoodStream must actively prevent.

### 1. Popularity Feedback Loop (Filter Bubble)

**Problem:** A popular track gets recommended → gets more plays → gets ranked even higher → less popular but high-quality tracks never surface.

**How Spotify suffers from this:** The top 1% of their catalog receives a disproportionate share of algorithmic recommendations. Studies show new artists without playlist placement effectively have zero algorithmic visibility.

**MoodStream prevention:**
- Apply logarithmic decay to global play count in all scoring formulas: `popularity_signal = log(1 + playCount)`, not `playCount`
- Add a diversity penalty in the meta-ranker: Maximal Marginal Relevance (MMR) penalizes returning tracks too similar to already-served tracks in this session
- The `undergroundBoost` in Variant C explicitly counteracts popularity bias for KZ artists
- Set a hard floor: at least 20% of recommendations must come from artists with <10K global plays on MoodStream

### 2. Premature Personalization (Cold Start Overclaiming)

**Problem:** Showing "personalized for you" after 2 plays is a lie. Users see recommendations that feel random but are labeled personal, destroying trust.

**MoodStream prevention:**
- Show `topKzChart` and `acousticSimilarity` labels (not "personalized") until `totalPlays >= 20`
- After 20 plays, unlock "Your Mix" label with explanation of what data it uses
- Never show a personalization label that implies more data than exists

### 3. Sticky Negative State (Punishing Exploration)

**Problem:** If a user listens to a different genre for one session (road trip, party), the algorithm recalibrates toward that genre for weeks, punishing the exploration.

**MoodStream prevention:**
- Use exponential decay on historical data: plays older than 30 days have half the weight of recent plays
- Session-context signals (Variant D) are computed from current session only, not historical average
- Never use a single session as ground truth for long-term profile updates — batch-update profiles from rolling 14-day windows, not real-time

### 4. Explanation Without Causality ("Post-Hoc Rationalization")

**Problem:** Spotify says "Because you listened to X" — but X may not have actually caused the recommendation. The explanation is generated separately from the ranking model and may be false.

**MoodStream prevention:**
- Explanation strings must be generated from the actual `scoreComponents` that produced the rank, not from a separate similarity lookup
- If `scoreA` (transparency/explicit preference) is the dominant term, the reason string reflects that, not a vague "similar artist" label
- Log the `scoreComponents` alongside every recommendation served — enabling future audit and user dispute ("why was this recommended?")

### 5. Explicit Feedback That Doesn't Work

**Problem:** Users hide a track/artist, and it comes back weeks later. This is one of the most cited frustrations with Spotify and Apple Music.

**MoodStream prevention:**
- `hidden_track_ids` and `hidden_artist_ids` are applied at the **candidate filtering stage** (step 1 of the pipeline), not as a score penalty. A hidden track never enters the ranking pool.
- These arrays are stored in `user_recommendation_profiles` and synced to Redis as a bloom filter for fast lookup
- Show users their hidden list in Settings → "Tracks you've hidden" with a restore option — transparency that hides do actually work

### 6. Ignoring Locale in Feature Extraction

**Problem:** Track metadata and tags processed through English-only NLP pipelines produce garbage for Kazakh/Russian content. Genre tags like "этника", "қазақ рок" are not parsed by English models.

**MoodStream prevention:**
- Audio-based features (Variant B) are language-agnostic — BPM, energy, valence don't require NLP
- For text-based signals (search, artist descriptions, tag parsing): use multilingual models or explicit Kazakh/Russian tokenization
- Artist name transliteration must be handled at ingestion, not at query time — store all three forms (`artistNameKk`, `artistNameRu`, `artistNameEn`) in the schema

---

**1. The Kazakh-language music graph.** No competitor has a properly labeled, transliteration-aware index of KZ artists. Building this — even with 500 artists — creates a moat that takes years to replicate. Artist similarity graph for Kazakh music does not exist anywhere.

**2. Transparent scoring as a product feature.** "Here's why we recommended this, and here's the slider to change it" is not just a UX choice — it's a legal and ethical positioning that matters as AI regulation grows. No major streaming platform offers this. Deezer comes closest but stops short. MoodStream can own "the streaming service that respects your intelligence."

**3. Offline-aware recommendations.** Recommending from your downloaded cache based on time-of-day and session context requires no internet, no server round-trip, and works in areas with poor connectivity — which describes significant portions of Kazakhstan outside major cities. This is a genuine technical advantage that compounds with the offline-first architecture.

**4. Regional micro-charts (Almaty vs Astana vs Shymkent).** This is a feature that local music media, artists, and fans will talk about. "Trending in Shymkent" creates a sense of local identity that global platforms cannot manufacture. It also gives new KZ artists a path to discovery that doesn't require beating global popularity algorithms.

**5. Explicit feedback that actually works.** Spotify's "don't play this artist" feature is documented to have weak effect (users report the same artists returning within weeks). If MoodStream makes "hide this track" an immediate, permanent, verifiable action — and shows users their hidden list — it creates trust that compounds into retention.

**6. Anti-popularity recommendations for underground KZ.** Every other platform's algorithm deprioritizes artists with low play counts. MoodStream's `undergroundBoost` (Variant C) inverts this for KZ-origin tracks with growing momentum. A KZ artist releasing their second track should be surfaced to users who like their genre within 48 hours of ingestion — before any playlist placement or editorial attention. This creates a genuine artist-first reputation in the local market.

**7. Quality-weighted charts, not count-weighted.** Kazakhstan's current music charts (where they exist) are raw play-count ranked. A track spammed by bots or promoted through paid streams ranks above a genuinely beloved underground track. MoodStream can publish a "quality score" chart that factors in completion rate, like-to-play ratio, and organic discovery rate. Artists and fans will trust and share this because it reflects actual love, not ad spend.

The recommendation engine is not MoodStream's core moat — the KZ library and local relevance are. But a recommendation layer that is more transparent, more local, and more responsive to user control than any competitor turns a library advantage into a daily engagement advantage. Critically, the architecture described here can be built incrementally: start with Variant A (no ML required) and Variant C (Redis sorted sets for regional trends), ship in Phase 6, and add acoustic DNA and session context in subsequent phases as the play event dataset grows.

---

## Open Questions and Research Gaps

These items require validation before implementation decisions are made:

1. **Audio feature extraction at scale:** `music-metadata` npm package extracts BPM and basic metadata. Does it produce energy/valence estimates, or is a Python subprocess (librosa/essentia) required? Need to profile extraction time per track to estimate BullMQ queue saturation at 10K track catalog scale.

2. **pgvector performance at KZ catalog scale:** Initial catalog is estimated at 50K–200K tracks. At what point does `ivfflat` index need to be replaced with `hnsw`? Benchmarking needed before committing to index type.

3. **Cohort size minimum:** K-means cohort clustering produces useful signals only with sufficient user volume per cohort. At <10K users, cohorts will be too small for meaningful CF signals. Need a minimum cluster size threshold and a fallback (use regional trending instead of cohort CF) until that threshold is met.

4. **Kazakh-language mood tagging:** "Мұңлы" (mournful/longing), "Қуанышты" (joyful), "Жігерлі" (energetic) are mood concepts with Kazakh cultural specificity that don't map cleanly to English mood taxonomies. A small editorial task (tagging 500 Kazakh tracks with KZ-specific mood labels) would provide training data for a classifier. Worth scoping as a Phase 7 editorial task.

5. **User weight adjustment UX:** The weight slider UI for Variant A requires careful design. Too many sliders create cognitive overhead (Deezer's problem: users rarely adjust Flow settings). Consider: start with 2 sliders (KZ content level, energy preference), reveal advanced controls progressively, and show before/after recommendation preview when sliders are adjusted.

---

*Generated: 2026-04-07 | Extended: 2026-04-07 | MoodStream KZ Internal Research*
*Section history: v1.0 initial — competitor analysis + 4 variants + meta-ranker + roadmap. v1.1 added — Last.fm analysis, competitor matrix, data schemas, anti-patterns, open questions.*
