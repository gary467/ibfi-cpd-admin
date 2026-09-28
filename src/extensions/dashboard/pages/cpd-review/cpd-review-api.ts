import { items } from '@wix/data';

export const COLLECTION_ID = 'CPDSubmissions';

export type ReviewStatus = 'Pending' | 'Reviewed';

export const REVIEW_STATUSES: ReviewStatus[] = ['Pending', 'Reviewed'];

/** One row in the review queue. */
export interface CpdSubmissionRow {
  id: string;
  title: string;
  memberName: string;
  memberId?: string;
  dateCompleted?: string;
  activityDesc?: string;
  reviewStatus: ReviewStatus;
  pointsAwarded?: number | null;
  reviewNotes?: string;
  reviewedDate?: string;
  certificateDoc?: string;
  certificateImage?: string;
  submittedDate?: string;
}

export interface CpdQuery {
  search?: string;
  statuses?: ReviewStatus[];
}

/**
 * Free-text search across the two LONG/SHORT TEXT fields only. `contains` on a
 * number, date or reference field is not a narrower match, it is no match.
 */
const SEARCH_FIELDS = ['title', 'activityDesc'];

/**
 * Seed the filter with the first field and `or()` the rest onto it, then `and()`
 * the whole thing onto the query. Calling `or()` straight onto a query that holds
 * no condition contributes an empty branch, and `{} OR x` matches every row.
 */
const searchFilter = (term: string) =>
  SEARCH_FIELDS.map((field) => items.filter().contains(field, term)).reduce((acc, f) =>
    acc.or(f)
  );

/** Shared by fetchData and the count, so the two can never disagree. */
const applyFilters = (baseQuery: ReturnType<typeof items.query>, q: CpdQuery) => {
  let query = baseQuery;

  if (q.statuses?.length) {
    query = query.hasSome('reviewStatus', q.statuses);
  }

  const term = q.search?.trim();
  if (term) {
    query = query.and(searchFilter(term));
  }

  return query;
};

/**
 * The `member` field is a reference to Members/PrivateMembersData. What the
 * referenced item exposes varies with the caller's permissions, so every shape
 * is treated as optional and the id is the last resort rather than a crash.
 */
const memberNameOf = (raw: Record<string, unknown>): string => {
  const member = raw.member as Record<string, unknown> | string | undefined;

  if (!member) return 'Unknown member';
  if (typeof member === 'string') return member;

  const profile = (member.profile ?? {}) as Record<string, unknown>;
  const contact = (member.contact ?? {}) as Record<string, unknown>;

  const first = (contact.firstName ?? member.firstName) as string | undefined;
  const last = (contact.lastName ?? member.lastName) as string | undefined;
  const full = [first, last].filter(Boolean).join(' ').trim();

  return (
    (profile.nickname as string) ||
    full ||
    (member.loginEmail as string) ||
    (member._id as string) ||
    'Unknown member'
  );
};

const toRow = (raw: Record<string, unknown>): CpdSubmissionRow => {
  const member = raw.member as Record<string, unknown> | string | undefined;

  return {
    id: raw._id as string,
    title: (raw.title as string) || 'Untitled submission',
    memberName: memberNameOf(raw),
    memberId: typeof member === 'string' ? member : (member?._id as string | undefined),
    dateCompleted: raw.dateCompleted as string | undefined,
    activityDesc: raw.activityDesc as string | undefined,
    reviewStatus: ((raw.reviewStatus as ReviewStatus) ?? 'Pending') as ReviewStatus,
    pointsAwarded: (raw.pointsAwarded as number | null | undefined) ?? null,
    reviewNotes: raw.reviewNotes as string | undefined,
    reviewedDate: raw.reviewedDate as string | undefined,
    certificateDoc: raw.certificateDoc as string | undefined,
    certificateImage: raw.certificateImage as string | undefined,
    submittedDate: raw._createdDate as string | undefined,
  };
};

export async function fetchCpdPage(params: {
  limit: number;
  offset?: number;
  search?: string;
  statuses?: ReviewStatus[];
}): Promise<{ items: CpdSubmissionRow[] }> {
  const result = await applyFilters(items.query(COLLECTION_ID), params)
    // Oldest first: the review queue should surface what has waited longest.
    .ascending('_createdDate')
    .skip(params.offset ?? 0)
    .limit(params.limit)
    .include('member')
    .find();

  return { items: (result.items as Record<string, unknown>[]).map(toRow) };
}

/**
 * A real count from a builder that counts, filtered identically to the rows.
 * Never read a total off a paged response and fall back to 0 - that ships a
 * confident zero beside a full table.
 */
export function countCpd(q: CpdQuery): Promise<number> {
  return applyFilters(items.query(COLLECTION_ID), q).count();
}

export async function fetchSubmission(id: string): Promise<CpdSubmissionRow | undefined> {
  const raw = await items.get(COLLECTION_ID, id);
  return raw ? toRow(raw as unknown as Record<string, unknown>) : undefined;
}

/**
 * Award points and mark the submission reviewed.
 *
 * `items.update` REPLACES the stored item, so the existing record is read first
 * and spread in. Sending only the changed fields would wipe the member's title,
 * description and certificate.
 *
 * The site's beforeUpdate hook lets this through because the caller is not the
 * owning member - see src/backend/data.js in the site repo (gary467/ibfi).
 */
export async function saveReview(input: {
  id: string;
  pointsAwarded: number;
  reviewNotes?: string;
}): Promise<CpdSubmissionRow> {
  const existing = await items.get(COLLECTION_ID, input.id);
  if (!existing) {
    throw new Error('That submission no longer exists. It may have been deleted.');
  }

  const updated = await items.update(COLLECTION_ID, {
    ...(existing as Record<string, unknown>),
    _id: input.id,
    pointsAwarded: input.pointsAwarded,
    reviewNotes: input.reviewNotes ?? null,
    reviewStatus: 'Reviewed',
    reviewedDate: new Date(),
  } as never);

  return toRow(updated as unknown as Record<string, unknown>);
}
