---
channel: botanical-killers
skill: social-post-writer-seo
---

# Botanical Killers — Caption Rules

## Platforms
facebook, instagram

---

## Audience Comment Audit Layer

BK comments cluster into these behaviors — metadata must address them:

1. **Curiosity** — viewers ask what the plant is, where it grows, how it works, lookalikes
2. **Skepticism** — viewers question accuracy, toxicity, plant ID, exaggeration
3. **Medical / Alternative Use** — viewers mention remedies, teas, dosing, folk use
4. **Identification Help** — viewers ask if a nearby plant is the same species
5. **Personal Anecdote** — garden, pet, family, or local experiences

BK metadata must increase curiosity-driven retention while reducing safety, medical-advice, and overclaim risk.

---

## Caption Safety Contract

Every BK caption must include:
- Common name
- Scientific name
- Main toxic part
- Main exposure route
- High-risk group if relevant
- AI disclosure if AI visuals used

**Never:**
- Imply the whole plant is equally dangerous unless source supports it
- Imply casual touch is deadly unless actual risk is contact
- Give preparation, dosage, remedy, tea, extract, or ingestion instructions
- Encourage viewers to taste, test, brew, forage, or self-identify plants from the video

---

## Controlled Plant Reveal Rule

Do not reveal plant identity too early unless the plant name itself is the viral hook.

Preferred reveal order:
1. **Title / first caption line:** curiosity, danger, or beauty-to-horror hook
2. **Caption body:** common name reveal
3. **Plant ID Block / pinned comment:** scientific name + toxic part + exposure route

Never hide plant identity completely — scientific name must appear in caption or pinned comment.

---

## Safe CTA Rule

**Good CTAs:**
- "Would you recognize this plant in real life?"
- "Should we cover the lookalike next?"
- "Want part 2 on where this plant grows?"
- "Comment the plant you want us to fact-check next."
- "Have you seen this plant in your area? Do not touch or taste it — just tell us where."

**Avoid:**
- "Would you try this?" / "Have you eaten this before?" / "Do you use this as medicine?"
- "Tag someone who should taste this." / "Try this test at home."

---

## Plant ID Block

Use at the end of the caption **OR** as the pinned comment — not both.
If embedding makes FB caption > 300 chars → move to pinned comment, use FB Short variant.

```
Plant ID:
Common name: [common name]
Scientific name: [scientific name]
Main toxic part: [seeds/leaves/sap/root/fruit/bulb/whole plant]
Main risk: [ingestion/sap contact/pet ingestion/livestock grazing/mistaken foraging]
AI note: AI-assisted visuals are used for storytelling. Do not identify wild plants from a Reel alone. Use the scientific name, local field guides, or a qualified expert.
```

---

## Facebook Caption Template (Full)

```
[Curiosity hook — beauty / innocence / lookalike / danger. Do not fully reveal in first line.]
This is [common name]. The real danger is [toxic part] when [exposure route], especially for [target group].

Plant ID:
Common name: [common name]
Scientific name: [scientific name]
Main toxic part: [toxic part]
Main risk: [route]

AI Disclosure: Made with AI
#BotanicalKillers #[plant_tag] #ToxicPlants
```

## Facebook Caption Template (Short + Pinned Plant ID)

*Use when Plant ID Block would push caption > 300 chars.*

```
[Curiosity hook — do not fully spoil]
This is [common name]. Its [toxic part] can be dangerous when [route], especially for [target].

Plant ID is in the pinned comment.
AI Disclosure: Made with AI
#BotanicalKillers #[plant_tag] #ToxicPlants
```

---

## Instagram Caption Template

```
[Hook: beauty-then-danger reveal in 1 sentence — strong enough to work without a title]

This is [common name]. The real danger is [toxic part] when [exposure route].
Scientific name: [scientific name]
AI Disclosure: Made with AI

#BotanicalKillers #[plant_tag] #ToxicPlants #PlantScience #DangerousPlants
```

---

## Playlist / Series Routing

Always output a playlist routing section for BK upload metadata.
Read `references/bk-playlist-framework.md` for the approved playlist list. Do not invent new playlist names.

```markdown
## Playlist / Series Routing
**Primary Playlist:** [one playlist only]
**Reason:** [1 short sentence]
```

Rules:
- Choose exactly one Primary Playlist
- Keep Reason to one short sentence
- Do not output CTA or setup instructions unless user asks
- If multiple playlists fit, use selection priority in `references/bk-playlist-framework.md`

---

## BK-Specific Common Fixes

| Problem | Fix |
|---------|-----|
| Caption claims "this plant kills" too broad | Specify toxic part + route + target group |
| Caption reveals plant ID too early | Hook first → common name → scientific name in Plant ID Block |
| Caption missing scientific name | Add in caption or Plant ID Block |
| Caption mixes touch vs ingestion risk | Sap ≠ seed ≠ leaf; touch ≠ ingestion — specify exactly |
| CTA encourages unsafe behavior | Replace with safe curiosity CTA (see Safe CTA Rule above) |
| Viewer asks plant identification | Do not confirm from comment/image — redirect to scientific name + field guide |
| Comments asking for remedy/tea/dosage | Use Safety/Medical Use Reply from `references/bk-reply-pack.md` |

> **BK Reply Seeds** (pinned comment, curiosity/skepticism/medical replies) → `.agents/skills/social-post-writer-seo/bk-reply-pack.md`
