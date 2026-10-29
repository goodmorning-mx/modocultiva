# Activity destination: the next clarity level

An activity belongs to a source level (0–8), but its intended outcome must match the **next** clarity description. Completing a task at the source level is not, on its own, evidence of greater clarity. The person should be able to recognize themselves in the target description after doing the activity; reviewers must examine that congruence, the evidence and the required effort. No recommendation promises a personal outcome or automatic approval.

## One versioned rubric

`backend/app/clarity_levels.json` and its client mirror `frontend/src/clarity-levels.json` contain the existing names/descriptions for all ten levels in all eleven supported languages, copied without rewriting their meaning. `verify:clarity` checks exact equality. `app.clarity.clarity_transition` and `frontend/src/clarityRubric.ts` provide a source, exact next target, version and current-level effort tier. Unsupported activity levels (including image-only level9) are rejected. Snapshots returned by the server cannot mutate the cached rubric.

The mirrored files keep the separately built frontend/backend images self-contained. Update both in one change and run the equality checks. A future substantive rubric change must version the snapshot; existing evidence must keep the rubric against which it was submitted.

## Where the destination appears

- Activity design in the journey, before the activity card/method choices.
- Custom activity editor.
- Bank recommendations.
- Mode AI studio; both authenticated and guest requests include the language, and the server constructs its target from the rubric rather than accepting a client's claimed target.

The bank still has ten curated quote/topic choices per mode and level, with the same sources and bounded durations. Practice templates were revised in all eleven languages to lead toward the next description:

| Source → target | Intended direction |
| --- | --- |
| 0 → 1 | Recognize a need and a possible response. |
| 1 → 2 | Name the problem and the barrier to a plan. |
| 2 → 3 | Actually try a small first action. |
| 3 → 4 | Repeat a minimum routine at fixed times. |
| 4 → 5 | Sustain that routine and protect stability. |
| 5 → 6 | Investigate a new direction, set a goal and allocate time/energy. |
| 6 → 7 | Practice over four weeks, measure, review and adjust. |
| 7 → 8 | Test optimization through automation or agreed delegation. |
| 8 → 9 | Turn experience into a guide, support a willing learner and improve from feedback. |

Effort stays based on the source level:0–2 time;3–5 time+energy;6–8 time+energy+investment. Suggestions must stay within the person's means; arbitrary spending is not a test of development. The level9 catalog entry remains only for compatibility: its journey is still an uploaded final-vision image, with no additional activity or quorum.

## Scope still to implement

This change adds guidance and AI prompting, not a pretend community validation. The active onboarding/community goal still requires authenticated network connections, evidence revisions, three distinct independent approvals, no self-review, stale/replay protections and one-time completion/advancement when the source is still current. The tutorial must explain the same next-clarity criterion. Historical saved activities, levels, presets, completions and images are preserved and are not relabeled as peer-reviewed.
