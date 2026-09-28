import { app } from '@wix/astro/builders';

import cpdReview from './extensions/dashboard/pages/cpd-review/cpd-review.extension.ts';

export default app().use(cpdReview);
