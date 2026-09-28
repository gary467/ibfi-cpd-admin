import { withDashboard } from '@wix/patterns';
import { WixPatternsProvider } from '@wix/patterns/provider';
import { PatternsReactRouter, PatternsReactRoute } from '@wix/patterns/router';
import { CpdReviewCollectionPage } from './CpdReviewCollectionPage';
import { CpdReviewEntityPage } from './CpdReviewEntityPage';

// The route paths are page-scoped already, so the collection sits at '/' even
// though the page was scaffolded with route "cpd-review". Prefixing with
// '/cpd-review' here would silently never match.
//
// No createEntity route: submissions are created by members on the site, never
// by IBFI in the dashboard. Lee only ever opens an existing one to review it.
export const CpdReviewApp = withDashboard(() => (
  <WixPatternsProvider>
    <PatternsReactRouter>
      <PatternsReactRoute type="collection" path="/" element={<CpdReviewCollectionPage />} />
      <PatternsReactRoute type="editEntity" path="/:id" element={<CpdReviewEntityPage />} />
    </PatternsReactRouter>
  </WixPatternsProvider>
));
