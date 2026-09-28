import { useParams } from 'react-router-dom';
import { EntityPage, useEntityPage } from '@wix/patterns';
import { useForm } from '@wix/patterns/form';
import {
  Badge,
  Card,
  Cell,
  FormField,
  Layout,
  NumberInput,
  Text,
  InputArea,
} from '@wix/design-system';
import { fetchSubmission, saveReview, type CpdSubmissionRow } from './cpd-review-api';

/** The form's shape is ours to declare and need not match the stored entity. */
type ReviewFormFields = {
  pointsAwarded: number;
  reviewNotes: string;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Cell>
    <Text size="small" secondary>
      {label}
    </Text>
    <Text>{children}</Text>
  </Cell>
);

export const CpdReviewEntityPage = () => {
  const { id } = useParams<{ id?: string }>();
  const form = useForm<ReviewFormFields>();

  const state = useEntityPage<CpdSubmissionRow, ReviewFormFields>({
    // Patterns Router is always in play for this shape, so parentPath, not parentPageId.
    parentPath: '/',
    // A getter: the route can change while this component stays mounted.
    isNewEntity: () => !id,
    form,
    fetch: () =>
      id
        ? fetchSubmission(id).then((entity) => ({ entity }))
        : Promise.resolve({ entity: undefined }),
    onSave: () =>
      saveReview({
        id: id as string,
        pointsAwarded: Number(form.getValues().pointsAwarded ?? 0),
        reviewNotes: form.getValues().reviewNotes,
      }).then((updatedEntity) => ({ updatedEntity })),
  });

  const submission = state.entity;
  const isReviewed = submission?.reviewStatus === 'Reviewed';

  return (
    <EntityPage state={state}>
      <EntityPage.Header
        title={{ text: submission?.title ?? 'CPD submission' }}
        subtitle={submission ? `Submitted by ${submission.memberName}` : undefined}
      />
      <EntityPage.Content>
        <EntityPage.MainContent>
          <Card>
            <Card.Header
              title="Submission"
              suffix={
                <Badge size="small" skin={isReviewed ? 'success' : 'warning'}>
                  {isReviewed ? 'Reviewed' : 'Awaiting review'}
                </Badge>
              }
            />
            <Card.Divider />
            <Card.Content>
              <Layout cols={2}>
                <DetailRow label="Member">{submission?.memberName ?? '—'}</DetailRow>
                <DetailRow label="Date completed">
                  {formatDate(submission?.dateCompleted)}
                </DetailRow>
                <Cell>
                  <Text size="small" secondary>
                    Course or activity
                  </Text>
                  <Text>{submission?.activityDesc || 'No description given.'}</Text>
                </Cell>
                <DetailRow label="Certificate">
                  {/* TODO: these hold wix:document:// and wix:image:// references,
                      which are not directly openable URLs. Resolving them to a
                      viewable link is the one piece still outstanding - Lee
                      cannot review evidence he cannot open. */}
                  {submission?.certificateDoc
                    ? 'PDF attached'
                    : submission?.certificateImage
                      ? 'Image attached'
                      : 'None attached'}
                </DetailRow>
                <DetailRow label="Submitted">{formatDate(submission?.submittedDate)}</DetailRow>
              </Layout>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header
              title="IBFI review"
              subtitle="Points are set by IBFI. Members cannot change them."
            />
            <Card.Divider />
            <Card.Content>
              <Layout cols={2}>
                <Cell span={1}>
                  <FormField label="Points awarded" required>
                    <NumberInput
                      min={0}
                      value={form.watch('pointsAwarded') ?? undefined}
                      onChange={(value) => form.setValue('pointsAwarded', Number(value ?? 0))}
                    />
                  </FormField>
                </Cell>
                <Cell span={2}>
                  <FormField label="Review notes" infoContent="Internal only — not shown to the member.">
                    <InputArea
                      rows={3}
                      value={form.watch('reviewNotes') ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                        form.setValue('reviewNotes', event.target.value)
                      }
                    />
                  </FormField>
                </Cell>
                {isReviewed ? (
                  <Cell span={2}>
                    <Text size="small" secondary>
                      Reviewed on {formatDate(submission?.reviewedDate)}. Saving again updates the
                      points awarded.
                    </Text>
                  </Cell>
                ) : null}
              </Layout>
            </Card.Content>
          </Card>
        </EntityPage.MainContent>
      </EntityPage.Content>
    </EntityPage>
  );
};
