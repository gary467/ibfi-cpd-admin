import type { FC } from 'react';
import {
  CollectionEmptyState,
  CollectionErrorState,
  CollectionNoResultsState,
  CollectionSearch,
  CollectionToolbarFilters,
  MultiSelectCheckboxFilter,
  Table,
  stringsArrayFilter,
  useStaticListFilterCollection,
  useTableCollection,
} from '@wix/patterns';
import { CollectionPage } from '@wix/patterns/page';
import { usePatternsNavigate } from '@wix/patterns/router';
import { Badge, Text } from '@wix/design-system';
import {
  REVIEW_STATUSES,
  countCpd,
  fetchCpdPage,
  type CpdSubmissionRow,
  type ReviewStatus,
} from './cpd-review-api';

// Module level: one filter instance per page, not one per render.
// `name` feeds a11y legends and dataHooks - the visible title comes from the
// label props on the component below.
const statusFilter = stringsArrayFilter<ReviewStatus>({
  name: 'Review status',
  itemKey: (item) => item,
  itemName: (item) => item,
});

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const CpdReviewCollectionPage: FC = () => {
  const { navigateToEntityPage } = usePatternsNavigate<CpdSubmissionRow>();

  const state = useTableCollection<CpdSubmissionRow, { status: typeof statusFilter }>({
    queryName: 'cpd-review',
    paginationMode: 'offset',
    itemKey: (item) => item.id,
    itemName: (item) => item.title,
    filters: { status: statusFilter },
    fetchData: async (query) =>
      fetchCpdPage({
        limit: query.limit,
        offset: query.offset,
        search: query.search,
        statuses: query.filters.status,
      }),
    // A real count from a builder that counts, filtered the same way as the
    // rows, so the figure can never disagree with the table under it.
    fetchTotal: async (query) =>
      countCpd({ search: query.search, statuses: query.filters.status }),
    fetchErrorMessage: ({ err }) =>
      err instanceof Error ? err.message : 'Failed to load CPD submissions',
  });

  const statusOptions = useStaticListFilterCollection(statusFilter, REVIEW_STATUSES);

  return (
    <CollectionPage>
      <CollectionPage.Header title={{ text: 'CPD Review' }} />
      <CollectionPage.Content>
        <Table
          state={state}
          search={<CollectionSearch placeholder="Search by title or activity" />}
          filters={
            <CollectionToolbarFilters>
              <MultiSelectCheckboxFilter
                filter={statusFilter}
                collection={statusOptions}
                toolbarItemProps={{ label: 'Review status' }}
                accordionItemProps={{ label: 'Review status' }}
              />
            </CollectionToolbarFilters>
          }
          emptyState={
            <CollectionEmptyState
              title="No CPD submissions yet"
              subtitle="Submissions appear here as members log their CPD activities."
            />
          }
          noResultsState={
            <CollectionNoResultsState
              title="No submissions match"
              subtitle="Try a different search term, or clear the review status filter."
            />
          }
          errorState={(err, { retry }) => (
            <CollectionErrorState
              title="Couldn't load CPD submissions"
              subtitle={String(err)}
              action={{ text: 'Retry', onClick: retry }}
            />
          )}
          onRowClick={(item) => navigateToEntityPage({ path: `/${item.id}`, entity: item })}
          columns={[
            {
              id: 'member',
              title: 'Member',
              render: (item) => <Text size="small">{item.memberName}</Text>,
            },
            {
              id: 'title',
              title: 'Activity',
              render: (item) => <Text size="small">{item.title}</Text>,
            },
            {
              id: 'dateCompleted',
              title: 'Completed',
              render: (item) => <Text size="small">{formatDate(item.dateCompleted)}</Text>,
            },
            {
              id: 'status',
              title: 'Status',
              render: (item) => (
                <Badge size="small" skin={item.reviewStatus === 'Reviewed' ? 'success' : 'warning'}>
                  {item.reviewStatus === 'Reviewed' ? 'Reviewed' : 'Awaiting review'}
                </Badge>
              ),
            },
            {
              id: 'points',
              title: 'Points',
              // An unreviewed submission has no points yet, which is not the
              // same as being awarded zero.
              render: (item) => (
                <Text size="small">
                  {item.reviewStatus === 'Reviewed' ? (item.pointsAwarded ?? 0) : '—'}
                </Text>
              ),
            },
          ]}
        />
      </CollectionPage.Content>
    </CollectionPage>
  );
};
