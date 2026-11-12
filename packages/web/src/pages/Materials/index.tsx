import { useAuth } from '@imapps/web-utils';
import type { Draft } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileEdit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { getDraftsQuery, makeDeleteDraftRequest } from '../../api/endpoints/drafts';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import { ListPageHeader } from '../../components/ListPageHeader';
import MaterialsTable from '../../components/MaterialsTable';
import { StateView } from '../../components/StateView';
import { ADD_MATERIAL_PAGE } from '../../constants/routes';

const DraftsTable: React.FC<{ drafts: Array<Draft>; onDeleted: () => void }> = ({ drafts, onDeleted }) => {
    const { accessToken, login, logout } = useAuth();
    const navigate = useNavigate();
    const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);

    const handleResume = (draft: Draft) => {
        navigate(`${ADD_MATERIAL_PAGE.route}?draftId=${draft.id}`);
    };

    const confirmDelete = async () => {
        if (!draftToDelete) return;
        await makeDeleteDraftRequest(draftToDelete.id, () => accessToken, login, logout);
        setDraftToDelete(null);
        onDeleted();
    };

    return (
        <>
            <div className="rounded-md border bg-card mb-4">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                    <FileEdit className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-medium">Material drafts</h2>
                    <Badge variant="secondary">{drafts.length}</Badge>
                </div>
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="px-3">Name</TableHead>
                            <TableHead className="hidden w-48 px-3 md:table-cell">Last edited</TableHead>
                            <TableHead className="w-40 px-3 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {drafts.map((draft) => (
                            <TableRow key={draft.id} className="hover:bg-muted/50">
                                <TableCell data-name title={draft.name} className="px-3 font-medium">
                                    {draft.name}
                                </TableCell>
                                <TableCell className="hidden px-3 text-sm text-muted-foreground md:table-cell">
                                    {new Date(draft.updatedAt).toLocaleString()}
                                </TableCell>
                                <TableCell className="px-3">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleResume(draft)}
                                            className="min-h-11 px-3 text-sm md:min-h-8"
                                        >
                                            Resume
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDraftToDelete(draft)}
                                            className="size-11 p-0 text-destructive hover:text-destructive md:size-8"
                                            aria-label={`Delete draft ${draft.name}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <DeleteConfirmDialog
                name={draftToDelete?.name ?? null}
                description="The draft is permanently removed. This can't be undone."
                onConfirm={confirmDelete}
                onCancel={() => setDraftToDelete(null)}
            />
        </>
    );
};

const Materials = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const { data, isError, refetch } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const { data: drafts } = useQuery({
        ...getDraftsQuery('material', () => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const handleDraftDeleted = () => {
        queryClient.invalidateQueries({ queryKey: ['drafts', 'material'] });
    };

    if (isError) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="error" what="materials" onRetry={() => refetch()} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="loading" what="materials" />
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 md:p-6">
            <ListPageHeader title="Materials" addLabel="Add material" addRoute={ADD_MATERIAL_PAGE.route} />
            {drafts && drafts.length > 0 && <DraftsTable drafts={drafts} onDeleted={handleDraftDeleted} />}
            <MaterialsTable materials={data} onMaterialUpdated={() => refetch()} />
        </div>
    );
};

export default Materials;
