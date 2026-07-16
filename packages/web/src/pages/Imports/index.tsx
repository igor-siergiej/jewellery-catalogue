import { useAuth } from '@imapps/web-utils';
import type { ImportRun } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { makeGetImportRunsRequest } from '../../api/endpoints/importRuns';
import { NEW_IMPORT_PAGE, VIEW_IMPORT_RUN_PAGE } from '../../constants/routes';

const STATUS_VARIANT: Record<ImportRun['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    running: 'default',
    completed: 'secondary',
    failed: 'destructive',
    cancelled: 'outline',
};

const Imports: React.FC = () => {
    const { accessToken, login, logout } = useAuth();
    const navigate = useNavigate();

    const { data: runs = [] } = useQuery({
        queryKey: ['importRuns'],
        queryFn: () => makeGetImportRunsRequest(() => accessToken, login, logout),
        refetchInterval: (query) => ((query.state.data ?? []).some((r) => r.status === 'running') ? 1500 : false),
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Imports</h1>
                <Button onClick={() => navigate(NEW_IMPORT_PAGE.route)}>New import</Button>
            </div>

            {runs.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <UploadCloud />
                        </EmptyMedia>
                        <EmptyTitle>No Imports Yet</EmptyTitle>
                        <EmptyDescription>Upload an Etsy listings CSV to bulk-import your designs.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>File</TableHead>
                            <TableHead>Started</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead className="text-right">Created</TableHead>
                            <TableHead className="text-right">Updated</TableHead>
                            <TableHead className="text-right">Failed</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {runs.map((run) => (
                            <TableRow
                                key={run.id}
                                className="cursor-pointer"
                                onClick={() => navigate(VIEW_IMPORT_RUN_PAGE.getRoute(run.id))}
                            >
                                <TableCell className="font-medium">{run.fileName}</TableCell>
                                <TableCell>{new Date(run.startedAt).toLocaleString()}</TableCell>
                                <TableCell>
                                    <Badge variant={STATUS_VARIANT[run.status]}>{run.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    {run.processed}/{run.total}
                                </TableCell>
                                <TableCell className="text-right">{run.created}</TableCell>
                                <TableCell className="text-right">{run.updated}</TableCell>
                                <TableCell className="text-right">{run.failed.length}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
};

export default Imports;
