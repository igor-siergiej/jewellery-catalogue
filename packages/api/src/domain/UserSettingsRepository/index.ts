import type { UserSettings } from '@jewellery-catalogue/types';

export interface UserSettingsRepository {
    getByUserId(userId: string): Promise<UserSettings | null>;
    upsert(settings: UserSettings): Promise<void>;
}
