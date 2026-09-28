import { useEffect, useState, type FC } from 'react';
import { dashboard } from '@wix/dashboard';
import { WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { CpdReviewApp } from './CpdReviewApp';

// PatternsReactRouter reads the page location through container.usePageLocation(),
// which only withDashboard's `location` prop feeds. Nothing supplies it
// automatically in a Wix CLI app.
//
// Skipping this is a RUNTIME-ONLY failure: tsc and wix build both pass, because
// neither renders the page. Only opening it in the dashboard shows the throw.
type PageLocation = Parameters<Parameters<typeof dashboard.observeState>[0]>[1]['pageLocation'];

const Page: FC = () => {
  const [location, setLocation] = useState<PageLocation | undefined>();

  useEffect(() => {
    const subscription = dashboard.observeState((_pageParams, environment) => {
      setLocation(environment.pageLocation);
    });
    return () => subscription.disconnect();
  }, []);

  return (
    <WixDesignSystemProvider>
      {location ? <CpdReviewApp location={location} /> : null}
    </WixDesignSystemProvider>
  );
};

export default Page;
