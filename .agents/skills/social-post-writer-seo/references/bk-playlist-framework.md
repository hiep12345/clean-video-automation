# BK Playlist Framework

> Reference file for `social-post-writer-seo/SKILL.md`.
>
> Purpose: provide a fixed playlist setup and selection rules for Botanical Killers upload metadata.
>
> Default output in Upload Metadata must stay compact:
>
> ```markdown
> ## Playlist / Series Routing
> **Primary Playlist:** [one playlist from the approved list only]
> **Reason:** [1 short sentence]
> ```

---

## Table of Contents

1. Core Rule
2. Approved Playlist List
3. Playlist Selection Priority
4. Playlist Detail Cards
5. Quick Selection Matrix
6. Allowed Output Format
7. Forbidden Behavior
8. SKILL.md Integration Snippet

---

## 1. Core Rule

For BK upload metadata, choose exactly **one** Primary Playlist from the approved list.

Do not invent new playlist names during normal metadata generation.

The output should only include:

```markdown
## Playlist / Series Routing
**Primary Playlist:** [one playlist only]
**Reason:** [1 short sentence]
```

Only provide additional playlist setup details if the user explicitly asks to create, audit, or reorganize playlists.

---

## 2. Approved Playlist List

Use only these playlist names by default:

1. **Deadly Lookalikes**
2. **Beautiful But Poisonous**
3. **Pet & Child Plant Dangers**
4. **Toxic Parts Explained**
5. **Viewer Questions / Follow-Up Episodes**
6. **Poison Myths vs Reality**
7. **Historical Plant Poisons**
8. **Plants You Should Never Taste**

If none fits perfectly, choose the closest playlist based on the main audience intent.

---

## 3. Playlist Selection Priority

When a video could fit multiple playlists, choose the first matching rule in this priority order.

| Priority | If the video is mainly about... | Choose Primary Playlist |
|---:|---|---|
| 1 | A direct response to a viewer comment, requested plant, correction, or follow-up | Viewer Questions / Follow-Up Episodes |
| 2 | A toxic plant that looks like an edible plant, foraging plant, herb, vegetable, fruit, or familiar safe plant | Deadly Lookalikes |
| 3 | A plant risk focused on pets, children, livestock, or family garden safety | Pet & Child Plant Dangers |
| 4 | Correcting exaggeration, common-name confusion, touch-vs-ingestion confusion, or medicine-vs-poison misunderstanding | Poison Myths vs Reality |
| 5 | A historical poisoning, ancient army story, royal poison story, execution, folklore, or documented historical case | Historical Plant Poisons |
| 6 | Ingestion, tasting, berries, bulbs, seeds, teas, or eating risk is the main danger | Plants You Should Never Taste |
| 7 | The main educational value is identifying the toxic part: seed, sap, bulb, leaf, root, fruit, nectar, or pollen | Toxic Parts Explained |
| 8 | A beautiful, ornamental, garden, houseplant, or decorative plant with hidden danger | Beautiful But Poisonous |

### Tie-break rule

If two playlists fit equally:

- Choose the playlist that matches the **main hook** of the video.
- If still unclear, choose the playlist that best supports the **safest viewer action**.
- Do not create a new playlist name.

---

## 4. Playlist Detail Cards

## 4.1 Deadly Lookalikes

### Use when

The video is about a toxic plant that can be mistaken for an edible, medicinal, foraging, culinary, or familiar harmless plant.

### Audience intent

Viewers want to know:

- What does it look like?
- What is it confused with?
- How can people avoid confusing it?
- Is this the same plant near me?

### Good fits

- Death Camas vs wild onion
- Poison Hemlock vs wild carrot
- Lily of the Valley vs edible-looking leaves or berries
- Deadly Nightshade vs edible berries
- Autumn Crocus vs wild garlic or edible bulbs

### Not a fit

- A toxic ornamental plant with no strong edible lookalike angle
- A video mainly about pets or children
- A historical poison story where lookalike confusion is not central

### Playlist description

```markdown
Dangerous plants that can look edible, familiar, or easy to misidentify. Use scientific names and field guides for real-world plant ID.
```

### Caption CTA

```markdown
Watch more dangerous lookalikes in the Deadly Lookalikes series.
```

### Pinned comment CTA

```markdown
If this surprised you, watch Deadly Lookalikes next — it covers more plants mistaken for edible species.
```

---

## 4.2 Beautiful But Poisonous

### Use when

The video is mainly about a beautiful, ornamental, garden, houseplant, or decorative plant with a hidden toxic risk.

### Audience intent

Viewers think:

- I have this in my garden.
- I have seen this flower before.
- How can something this beautiful be dangerous?

### Good fits

- Oleander
- Foxglove
- Lily of the Valley
- Castor Bean as an ornamental
- Angel's Trumpet
- Rhododendron / Azalea

### Not a fit

- A plant mainly dangerous because it looks edible
- A pet-specific safety warning
- A myth-correction episode

### Playlist description

```markdown
Beautiful garden and ornamental plants with hidden toxic risks. Each episode separates the real toxic part, exposure route, and safety concern.
```

### Caption CTA

```markdown
More beautiful plants with dangerous secrets are in the Beautiful But Poisonous series.
```

### Pinned comment CTA

```markdown
If you grow ornamental plants, watch Beautiful But Poisonous next for more hidden-risk stories.
```

---

## 4.3 Pet & Child Plant Dangers

### Use when

The video is mainly about plant risk for pets, children, livestock, or home/family environments.

### Audience intent

Viewers want to know:

- Is this dangerous for my cat or dog?
- Should I remove this from my garden?
- Is this risky around children?
- What if livestock eat it?

### Good fits

- Sago Palm and pets
- Lilies and cats
- Oleander and pets/livestock
- Castor Bean seeds and children/pets
- Yew seeds and livestock
- Lily of the Valley around homes or children

### Not a fit

- Adult foraging mistakes with no pet/child angle
- Historical poison stories
- Pure mechanism videos

### Playlist description

```markdown
Plant safety episodes for pets, children, gardens, and livestock. Each video clarifies the toxic part, exposure route, and main risk group.
```

### Caption CTA

```markdown
Save the Pet & Child Plant Dangers series if you have pets, kids, or a garden.
```

### Pinned comment CTA

```markdown
For home and garden safety, watch Pet & Child Plant Dangers next.
```

---

## 4.4 Toxic Parts Explained

### Use when

The main lesson is that the risk depends on a specific plant part and exposure route.

### Audience intent

Viewers ask:

- Which part is toxic?
- Is touching it dangerous?
- Is it the seed, sap, bulb, leaf, fruit, root, or nectar?
- Why is one part more dangerous than another?

### Good fits

- Castor Bean seeds
- Rosary Pea seeds
- Giant Hogweed sap
- Death Camas bulbs
- Autumn Crocus bulbs
- Rhododendron nectar / mad honey
- Oleander leaves

### Not a fit

- Videos where lookalike confusion is the main hook
- Videos where pets/children are the main angle
- Pure history episodes

### Playlist description

```markdown
Seed, sap, bulb, leaf, root, fruit, or nectar — this series explains which plant part matters and how exposure changes the risk.
```

### Caption CTA

```markdown
The danger is usually specific. Watch Toxic Parts Explained to learn which part matters.
```

### Pinned comment CTA

```markdown
For the exact toxic part and route, watch Toxic Parts Explained next.
```

---

## 4.5 Viewer Questions / Follow-Up Episodes

### Use when

The video is made because of audience comments, a requested plant, a follow-up question, a correction, a region question, or a lookalike request.

### Audience intent

Viewers want to participate in the content loop:

- Do part 2.
- Cover this plant next.
- Is this related to the plant in my area?
- What about this lookalike?

### Good fits

- Comment-requested plants
- Lookalike follow-ups
- Region follow-ups
- Correction or clarification episodes
- "Viewer asked" episodes

### Not a fit

- Standard episodes not based on viewer input
- General toxic plant stories with no comment-driven context

### Playlist description

```markdown
Episodes based on viewer questions, requested plants, lookalike requests, corrections, and follow-up comments.
```

### Caption CTA

```markdown
This episode came from viewer curiosity. Watch Viewer Questions for more follow-ups.
```

### Pinned comment CTA

```markdown
Have a plant you want us to fact-check? Watch Viewer Questions and comment your next request.
```

---

## 4.6 Poison Myths vs Reality

### Use when

The video mainly corrects a misconception, exaggeration, unsafe folk belief, vague common name, or misleading claim.

### Audience intent

Viewers challenge or ask:

- Is this actually true?
- I touched this and nothing happened.
- Isn't this also medicine?
- Are you exaggerating?
- Does the whole plant kill you?

### Good fits

- Touch vs ingestion clarification
- Medicinal history vs unsafe self-use
- Common name confusion
- Toxicity overclaim correction
- "Bees are immune" or "mad honey" precision correction
- Myth: all parts are equally dangerous

### Not a fit

- Straightforward lookalike warning
- Purely ornamental danger story
- Comment follow-up unless the follow-up is a myth correction

### Playlist description

```markdown
Toxic plant stories are often more precise than the myth. This series separates real risk, exaggeration, traditional use, and unsafe assumptions.
```

### Caption CTA

```markdown
For the fact-check side of toxic plants, watch Poison Myths vs Reality.
```

### Pinned comment CTA

```markdown
Good toxic plant safety starts with precision. Watch Poison Myths vs Reality next.
```

---

## 4.7 Historical Plant Poisons

### Use when

The video is primarily about a historical event, ancient poisoning, army story, royal case, execution, folklore, or well-sourced poison history.

### Audience intent

Viewers want to know:

- Did this really happen?
- What is the historical source?
- Was this plant used as poison in the past?
- Is the story myth, history, or both?

### Good fits

- Mad honey and ancient army story
- Hemlock and historical execution
- Aconite / Monkshood history
- Deadly Nightshade historical poison use
- Castor Bean / ricin history, if handled carefully and safely

### Not a fit

- Modern garden safety episodes
- Pet risk episodes
- Lookalike identification episodes

### Playlist description

```markdown
Historical plant poison stories, ancient cases, folklore, and documented events — with careful wording when evidence is uncertain.
```

### Caption CTA

```markdown
If you like poison history, watch Historical Plant Poisons next.
```

### Pinned comment CTA

```markdown
For more plant poison history, watch Historical Plant Poisons next.
```

---

## 4.8 Plants You Should Never Taste

### Use when

The main risk is ingestion, tasting, berries, bulbs, seeds, toxic teas, or edible-looking plant parts.

### Audience intent

Viewers ask or imply:

- Can you eat it?
- Is the berry safe?
- Is the bulb like onion or garlic?
- Can this be made into tea?
- What happens if someone tastes it?

### Good fits

- Toxic berries
- Toxic bulbs
- Toxic seeds
- Toxic teas or infusions framed strictly as warnings
- Edible lookalike ingestion risk

### Not a fit

- Sap/contact-only plants
- Skin irritation-only plants
- Historical poison stories where ingestion is not the main framing

### Playlist description

```markdown
Plants, berries, bulbs, seeds, and teas that should not be tasted based on a video. This series focuses on ingestion risk and safe caution.
```

### Caption CTA

```markdown
Before you ever taste a wild or ornamental plant, watch Plants You Should Never Taste.
```

### Pinned comment CTA

```markdown
Never taste a plant from a video. Watch Plants You Should Never Taste for more ingestion-risk warnings.
```

---

## 5. Quick Selection Matrix

Use this matrix when choosing the Primary Playlist quickly.

| Main hook / video angle | Primary Playlist | Example reason |
|---|---|---|
| Looks like edible onion, garlic, carrot, berry, herb, or food plant | Deadly Lookalikes | It focuses on a dangerous edible-lookalike confusion. |
| Pretty garden flower, shrub, houseplant, or ornamental danger | Beautiful But Poisonous | It focuses on a beautiful plant with a hidden toxic risk. |
| Cat, dog, child, livestock, home garden safety | Pet & Child Plant Dangers | It focuses on risk around pets, children, or family spaces. |
| Seed/sap/bulb/leaf/root/nectar is the educational center | Toxic Parts Explained | It teaches which plant part and exposure route matter. |
| Made from comment/request/follow-up/correction | Viewer Questions / Follow-Up Episodes | It directly answers viewer curiosity or a follow-up request. |
| Corrects a myth, exaggerated claim, common-name issue, or medical-use confusion | Poison Myths vs Reality | It separates a toxic plant myth from the real safety risk. |
| Ancient army, execution, royal poison, folklore, historical poison case | Historical Plant Poisons | It focuses on a historical plant poison story. |
| Eating, tasting, toxic berry, bulb, seed, tea, or ingestion warning | Plants You Should Never Taste | It focuses on ingestion or tasting risk. |

---

## 6. Allowed Output Format

Default output must be compact.

```markdown
## Playlist / Series Routing
**Primary Playlist:** [approved playlist name]
**Reason:** [one short sentence]
```

### Good examples

```markdown
## Playlist / Series Routing
**Primary Playlist:** Deadly Lookalikes
**Reason:** It focuses on a toxic plant that can be mistaken for an edible species.
```

```markdown
## Playlist / Series Routing
**Primary Playlist:** Toxic Parts Explained
**Reason:** The main lesson is which plant part is dangerous and how exposure changes the risk.
```

```markdown
## Playlist / Series Routing
**Primary Playlist:** Pet & Child Plant Dangers
**Reason:** The risk is framed around pets, children, or home garden safety.
```

---

## 7. Forbidden Behavior

Do not output the full playlist framework during normal upload metadata generation.

Do not include:

- full playlist descriptions
- include/exclude rules
- all CTA templates
- Notion fields
- setup instructions
- multiple primary playlists
- newly invented playlist names

Do not choose vague playlist labels such as:

- Toxic Plants
- Dangerous Plants
- Plant Facts
- Nature Facts
- BK Series
- Poisonous Plants

Use only the approved playlist list.

---

## 8. SKILL.md Integration Snippet

Add this compact rule to `social-post-writer-seo/SKILL.md`.

```markdown
---

## BK Playlist / Series Routing

For Botanical Killers upload metadata, always output a compact playlist routing section.

Read `references/bk-playlist-framework.md` when selecting the playlist.

Use only the approved playlist list from that reference. Do not invent new playlist names.

### Required Output

```markdown
## Playlist / Series Routing
**Primary Playlist:** [one playlist only]
**Reason:** [1 short sentence]
```

### Rules

- Choose exactly one Primary Playlist.
- Keep Reason to one short sentence.
- Do not output CTA, setup instructions, Notion fields, or long playlist descriptions unless the user explicitly asks.
- If multiple playlists fit, use the selection priority in `references/bk-playlist-framework.md`.
```
