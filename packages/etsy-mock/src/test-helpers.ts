import type { Scenario } from './fixtures';
import { MockStore } from './store';

export const DEFAULT_SCOPES = ['listings_r', 'listings_w', 'shops_r', 'transactions_r', 'email_r'];

export function connectedUser(store: MockStore, scenario: Scenario = 'established', scopes = DEFAULT_SCOPES) {
    const user = store.createUser({ shopName: 'Test Shop', scenario });
    const token = store.issueToken(user.userId, scopes);
    return {
        user,
        headers: { 'x-api-key': 'key:secret', Authorization: `Bearer ${token.accessToken}` },
    };
}

export { MockStore };
