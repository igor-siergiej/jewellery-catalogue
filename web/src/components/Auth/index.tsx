import { toRelativeUrl } from '@okta/okta-auth-js';
import { useOktaAuth } from '@okta/okta-react';
import { useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Store } from '../Store';
import { Actions } from '../Store/types';
import LoadingScreen from '../Loading';

export const RequiredAuth: React.FC = () => {
  const { oktaAuth, authState } = useOktaAuth();
  const [isLoading, setIsLoading] = useState(false);
  const storeContext = useContext(Store);

  useEffect(() => {
    if (!authState) {
      return;
    }

    if (!authState?.isAuthenticated) {
      const originalUri = toRelativeUrl(
        window.location.href,
        window.location.origin
      );
      oktaAuth.setOriginalUri(originalUri);
      oktaAuth.signInWithRedirect();
    } else {
      const getUser = async () => {
        setIsLoading(true);
        const user = await oktaAuth.getUser();
        storeContext.dispatch({
          type: Actions.SET_USER,
          payload: {
            firstName: user.given_name ?? '',
            lastName: user.family_name ?? '',
            email: user.email ?? '',
          },
        });
        setIsLoading(false);
      };
      getUser();
    }
  }, [oktaAuth, !!authState, authState?.isAuthenticated]);

  if (!authState || !authState?.isAuthenticated || isLoading) {
    return <LoadingScreen />;
  }
  return <Outlet />;
};
