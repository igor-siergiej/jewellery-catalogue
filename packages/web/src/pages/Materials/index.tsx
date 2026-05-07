import { useAuth } from '@imapps/web-utils';
import type { Draft } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileEdit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { getDraftsQuery, makeDeleteDraftRequest } from '../../api/endpoints/drafts';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import LoadingScreen from '../../components/Loading';
import MaterialsTable from '../../components/MaterialsTable';
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
                    <span className="text-sm font-medium">Material Drafts</span>
                    <Badge variant="secondary">{drafts.length}</Badge>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold">Last Edited</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {drafts.map((draft) => (
                            <TableRow key={draft.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <span className="flex items-center gap-2">
                                        {draft.name}
                                        <Badge variant="outline" className="text-xs">
                                            Draft
                                        </Badge>
                                    </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {new Date(draft.updatedAt).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleResume(draft)}
                                            className="h-8 px-3 text-xs"
                                        >
                                            Resume
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDraftToDelete(draft)}
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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

            <AlertDialog open={!!draftToDelete} onOpenChange={(open) => !open && setDraftToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete draft "{draftToDelete?.name}"? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const Materials = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const { data, isError, error, refetch } = useQuery({
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
            <span>
                Something went wrong! :(
                {error.message}
            </span>
        );
    }

    if (!data) {
        return <LoadingScreen />;
    }

    return (
        <div>
            {drafts && drafts.length > 0 && <DraftsTable drafts={drafts} onDeleted={handleDraftDeleted} />}
            <MaterialsTable materials={data} onMaterialUpdated={() => refetch()} />
        </div>
    );
};

export default Materials;
