import type { ActivityJourneyState } from './ActivityJourneyFlow';
import type { CommunitySubmission } from './communityClient';
import type { EvidenceDraft } from './visualEvidence';

export function submissionEvidenceDraft(submission: CommunitySubmission): EvidenceDraft {
  const evidence = submission.evidence;
  return { reflection: evidence.reflection, ...(evidence.link ? { link: evidence.link } : {}),
    visual: evidence.image ? { kind: 'photo', image: evidence.image } : evidence.video_asset_id ? { kind: 'video', video_asset_id: evidence.video_asset_id } : undefined };
}

export function adaptActivityFlow(options: { activity: string; alignment: string; mode: string; level: number; actor?: string; submissions: readonly CommunitySubmission[]; evidenceDraft?: { activity: string; draft: EvidenceDraft }; historical: boolean }): ActivityJourneyState {
  const { activity, alignment, mode, level, actor, submissions, evidenceDraft, historical } = options;
  if (!activity.trim()) return { status: 'empty' };
  const matching = submissions.filter(item => item.author_id === actor && item.mode === mode && item.source_level === level && item.activity.trim() === activity.trim())
    .sort((a, b) => b.revision_number - a.revision_number)[0];
  const definition = { activity, target_alignment: alignment || matching?.target_alignment || '' };
  const draft = evidenceDraft?.activity === activity ? evidenceDraft.draft : undefined;
  if (matching && ['pending', 'changes_requested', 'approved'].includes(matching.status)) {
    const evidence = submissionEvidenceDraft(matching);
    const validCount = matching.review_quorum === 3 && Number.isInteger(matching.review_count) && matching.review_count >= 0 && matching.review_count <= 3;
    const count = validCount ? matching.review_count as 0 | 1 | 2 | 3 : 0;
    const submission = { id: matching.id, revision: String(matching.revision_number), approvalCount: count };
    // Immutable reviewed target/explanation, not subsequently edited local notes.
    const savedDefinition = { activity, target_alignment: matching.target_alignment };
    if (matching.status === 'approved' && count === 3) return { status: 'approved', definition: savedDefinition, evidence, submission: { ...submission, approvalCount: 3 } };
    if (matching.status === 'pending') return { status: 'pending', definition: savedDefinition, evidence, submission };
    if (matching.status === 'changes_requested') return { status: 'changesRequested', definition, evidence: draft ?? evidence, submission,
      feedback: matching.reviews.filter(review => review.decision === 'changes_requested').map(review => review.feedback).join('\n') };
  }
  if (historical) return { status: 'legacyHistorical', definition, evidence: draft };
  return { status: draft ? 'evidenceDraft' : 'defined', definition, evidence: draft };
}
