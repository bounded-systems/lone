# COGA usability testing

How to produce the **external evidence** that satisfies the cognitive
usability-testing criterion in [`CONFORMANCE.md`](../../CONFORMANCE.md) (the
`W3C COGA` row, footnote ⁴). lone's static `LONE_COGA_*` budget is an
**interface-complexity budget** — it scores the rendered DOM, not a person's
cognition. Cognitive accessibility cannot be claimed from automation alone; it
needs task-based testing with people who have cognitive and learning
disabilities, with an independent verifier named. Until that evidence exists the
row stays `not-assessed`, and self-asserted "we tested it" does **not** gate.

**Canonical sources**

- [Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/)
  — §"user testing" and the design objectives the tasks should exercise.
- [Cognitive Accessibility User Research](https://www.w3.org/TR/coga-user-research/)
  — participant profiles and research methods.
- [W3C COGA Task Force](https://www.w3.org/WAI/about/groups/task-forces/coga/).

## Protocol

### 1. Critical journeys (fill per site)

Pick **3–5** tasks that represent what the site is _for_ — the journeys whose
failure makes the product unusable, not edge cases. Each task is a goal stated
in the participant's terms, never the UI's:

- [ ] Journey A — e.g. "find out what this does and decide if it's for you"
- [ ] Journey B — e.g. "complete the primary action (sign up / buy / submit)"
- [ ] Journey C — e.g. "get help when you're stuck"

Keep tasks goal-shaped and non-leading: say "renew your subscription", not
"click the green Renew button in the top right".

### 2. Participants

- **5–8 participants** across a range of profiles per
  [coga-user-research](https://www.w3.org/TR/coga-user-research/): memory,
  attention, executive function, language/literacy, and processing differences.
  Do not treat "cognitive disability" as one profile.
- Recruit people who use their **own** assistive setup and habits — don't
  prescribe tools.
- Compensate participants at a fair rate. Document recruitment and informed
  consent.

### 3. Session structure (moderated, ~45–60 min)

1. Welcome, consent, and a reminder that **the site is being tested, not them**.
2. Accommodations stated up front: extra time is fine, breaks are fine, tasks
   can be re-read, no time pressure.
3. Think-aloud per task; the moderator stays silent unless the participant is
   stuck long enough to abandon. Record each **facilitator-rescue** event — a
   rescue means the task did not pass unaided.
4. Brief post-task difficulty rating in plain language ("easy / okay / hard").
5. Debrief: what was confusing, what helped.

### 4. What to measure

| Measure                   | Meaning                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Task completion (unaided) | Did the participant finish **without** a facilitator rescue?                                         |
| Rescue events             | Where the journey broke down and why                                                                 |
| Observed barriers         | Mapped to Making-Content-Usable objectives (language, memory burden, unexpected change, findability) |
| Participant difficulty    | Self-reported, per task                                                                              |

A journey **passes** only when critical tasks are completed unaided by the large
majority of participants, with no severe barrier left unaddressed.

### 5. Ethics

Informed consent, the right to stop at any time, no dark patterns in the test
itself, fair compensation, and data handling the participant agrees to.

## Behavioral corroboration (not a substitute)

Stand up passive analytics — e.g. **Microsoft Clarity** (free) — to watch for
rage clicks, dead clicks, quick-backs, and abandonment on the same journeys.
This runs against real traffic immediately and corroborates the moderated
findings. It is **corroboration, never a substitute**: behavioral signal can
flag _where_ a journey hurts, but it can't tell you a person with a cognitive
disability completed the task.

## Recording the evidence

When the test is run, enter the result as external evidence in the lone
conformance envelope (the cognitive usability-testing row), naming the
independent verifier who conducted or signed off the test. The row then resolves
`met` / `unmet` from supplied evidence — see the `verifiedBy` discipline in
[`CONFORMANCE.md`](../../CONFORMANCE.md).

## Recruitment options

The recruitment route is the long pole and the budget decision. Rough shape
(confirm current pricing/lead-time at engagement):

| Route                                 | What it is                                                                                       | Cost                   | Lead time  | Notes                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------- | ---------- | --------------------------------------------------- |
| Specialist accessibility panels       | Vetted participants with disabilities, moderation tooling (e.g. Fable, Access Works, Knowbility) | $$–$$$                 | Days–weeks | Fastest to credible participants; pay per session   |
| University disability services / orgs | Partner with disability-services offices or advocacy groups                                      | $–$$ (often honoraria) | Weeks      | Lower cost, more relationship/coordination overhead |
| Screened remote-research tools        | General research panels with cognitive-profile screeners                                         | $$                     | Days       | Screening quality varies; vet profiles carefully    |

Recommended first move: scope the journeys and write the task list (no budget),
stand up Clarity in parallel (no budget), then commit to **one** recruitment
route for a first 5–8-participant round.
