export interface BaseRepository<T, TId = string> {
    getById(id: TId): Promise<T | null>;
    getAll(): Promise<Array<T>>;
    insert(entity: T): Promise<void>;
    update(id: TId, entity: T): Promise<void>;
    delete(id: TId): Promise<void>;
}
