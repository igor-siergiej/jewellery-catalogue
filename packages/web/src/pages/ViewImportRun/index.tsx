import { useAuth } from '@imapps/web-utils';
import type { ImportRun, ImportRunResult } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { makeCancelImportRunRequest, makeGetImportRunRequest } from '../../api/endpoints/importRuns';
import { DESIGNS_PAGE, IMPORTS_PAGE, VIEW_DESIGN_PAGE } from '../../constants/routes';

const STATUS_VARIANT: Record<ImportRun['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    running: 'default',
    completed: 'secondary',
    failed: 'destructive',
    cancelled: 'outline',
};

const OUTCOME_VARIANT: Record<ImportRunResult['outcome'], 'default' | 'secondary' | 'outline'> = {
    created: 'default',
    updated: 'secondary',
    skipped: 'outline',
};

const ViewImportRun: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { accessToken, login, logout } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [cancelling, setCancelling] = useState(false);

    const { data: run, error } = useQuery({
        queryKey: ['importRuns', id],
        queryFn: () => makeGetImportRunRequest(id as string, () => accessToken, login, logout),
        enabled: Boolean(id),
        refetchInterval: (query) => (query.state.data?.status === 'running' ? 1500 : false),
    });

    const finished = run?.status === 'completed';
    useEffect(() => {
        if (finished) queryClient.invalidateQueries({ queryKey: ['designs'] });
    }, [finished, queryClient]);

    const onCancel = async () => {
        if (!id) return;
        setCancelling(true);
        try {
            await makeCancelImportRunRequest(id, () => accessToken, login, logout);
            await queryClient.invalidateQueries({ queryKey: ['importRuns', id] });
        } finally {
            setCancelling(false);
        }
    };

    if (error) return <div className="text-destructive">Import run not found.</div>;
    if (!run) return null;

    const percent = run.total === 0 ? 100 : Math.round((run.processed / run.total) * 100);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">{run.fileName}</h1>
                    <Badge variant={STATUS_VARIANT[run.status]}>{run.status}</Badge>
                </div>
                <div className="flex gap-2">
                    {run.status !== 'running' && (
                        <Button onClick={() => navigate(DESIGNS_PAGE.route)}>View designs</Button>
                    )}
                    {run.status === 'running' && (
                        <Button variant="destructive" disabled={cancelling || run.cancelRequested} onClick={onCancel}>
                            {run.cancelRequested ? 'Cancelling…' : 'Cancel'}
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate(IMPORTS_PAGE.route)}>
                        Back to imports
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                        {run.processed} of {run.total} listings processed
                    </span>
                    <span>{percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                </div>
                {run.status === 'running' && run.currentListing && (
                    <p className="text-sm text-muted-foreground">
                        Processing <span className="font-medium text-foreground">{run.currentListing}</span>
                        {run.currentImageProgress &&
                            ` — image ${run.currentImageProgress.done}/${run.currentImageProgress.total}`}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4">
                {(
                    [
                        ['Created', run.created],
                        ['Updated', run.updated],
                        ['Failed', run.failed.length],
                    ] as const
                ).map(([label, count]) => (
                    <Card key={label}>
                        <CardContent className="p-4">
                            <p className="text-2xl font-semibold">{count}</p>
                            <p className="text-sm text-muted-foreground">{label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {(run.results ?? []).length > 0 && (
                <div className="space-y-2">
                    <h2 className="font-medium">Designs</h2>
                    <div className="divide-y rounded-md border">
                        {(run.results ?? []).map((r, index) => (
                            <div
                                key={`${r.designId ?? r.name}-${index}`}
                                className="flex items-center justify-between p-3 text-sm"
                            >
                                {r.designId ? (
                                    <Link
                                        to={VIEW_DESIGN_PAGE.getRoute(r.designId)}
                                        className="font-medium hover:underline"
                                    >
                                        {r.name}
                                    </Link>
                                ) : (
                                    <span>{r.name}</span>
                                )}
                                <Badge variant={OUTCOME_VARIANT[r.outcome]}>{r.outcome}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {run.failed.length > 0 && (
                <div className="space-y-2">
                    <h2 className="font-medium">Failed listings</h2>
                    <div className="divide-y rounded-md border">
                        {run.failed.map((f) => (
                            <div key={f.name} className="flex justify-between p-3 text-sm">
                                <span>{f.name}</span>
                                <span className="text-destructive">{f.reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewImportRun;
