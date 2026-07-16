import { useAuth } from '@imapps/web-utils';
import type { ImportCandidate, ImportPreviewResult } from '@jewellery-catalogue/types';
import { AlertTriangle, ImageOff, Loader2, Minus, RefreshCw, Sparkles, UploadCloud } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { makeCommitImportRequest, makePreviewImportRequest } from '../../api/endpoints/importDesigns';
import { IMPORTS_PAGE, VIEW_IMPORT_RUN_PAGE } from '../../constants/routes';

const STATUS_VARIANT: Record<ImportCandidate['status'], 'default' | 'secondary' | 'outline'> = {
    NEW: 'default',
    CHANGED: 'secondary',
    SAME: 'outline',
};

const SUMMARY_CARDS = [
    { key: 'new', label: 'New', icon: Sparkles, valueClassName: 'text-primary' },
    { key: 'changed', label: 'Changed', icon: RefreshCw, valueClassName: 'text-secondary' },
    { key: 'same', label: 'Unchanged', icon: Minus, valueClassName: 'text-muted-foreground' },
    { key: 'invalid', label: 'Invalid', icon: AlertTriangle, valueClassName: 'text-destructive' },
] as const;

const NewImport: React.FC = () => {
    const { accessToken, login, logout } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [fileName, setFileName] = useState<string | null>(null);
    const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = () => accessToken;

    const onFile = async (file: File) => {
        setBusy(true);
        setError(null);
        setPreview(null);
        setFileName(file.name);
        try {
            const res = await makePreviewImportRequest(file, token, login, logout);
            setPreview(res);
            setSelected(new Set(res.candidates.filter((c) => c.status === 'NEW').map((c) => c.importKey)));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Preview failed');
            setFileName(null);
        } finally {
            setBusy(false);
        }
    };

    const toggle = (key: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const selectableKeys = useMemo(
        () => (preview?.candidates ?? []).filter((c) => c.status !== 'SAME').map((c) => c.importKey),
        [preview]
    );
    const allSelected = selectableKeys.length > 0 && selectableKeys.every((k) => selected.has(k));
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableKeys));

    const chosen = useMemo(
        () => (preview?.candidates ?? []).filter((c) => selected.has(c.importKey)),
        [preview, selected]
    );

    const onCommit = async () => {
        if (chosen.length === 0 || !fileName) return;
        setBusy(true);
        setError(null);
        try {
            const res = await makeCommitImportRequest({ candidates: chosen, fileName }, token, login, logout);
            navigate(VIEW_IMPORT_RUN_PAGE.getRoute(res.runId));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Import failed');
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">New Etsy Import</h1>
                    <p className="text-sm text-muted-foreground">
                        Upload an Etsy listings CSV export to preview what will change before it touches your catalogue.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate(IMPORTS_PAGE.route)}>
                    Back to imports
                </Button>
            </div>

            <button
                type="button"
                className={`w-full rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                    dragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/40'
                } ${busy ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) onFile(f);
                }}
            >
                {busy ? (
                    <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                    <UploadCloud className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                )}
                <p className="font-medium">
                    {busy ? `Reading ${fileName}…` : (fileName ?? 'Drop your Etsy listings CSV here')}
                </p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onFile(f);
                    }}
                />
            </button>

            {error && (
                <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
            )}

            {preview && (
                <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {SUMMARY_CARDS.map(({ key, label, icon: Icon, valueClassName }) => (
                            <Card key={key}>
                                <CardContent className="flex items-center gap-3 p-4">
                                    <Icon className={`h-5 w-5 shrink-0 ${valueClassName}`} />
                                    <div>
                                        <p className={`text-2xl font-semibold ${valueClassName}`}>
                                            {preview.summary[key]}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {preview.invalid.length > 0 && (
                        <Card className="border-destructive/50">
                            <CardContent className="space-y-2 p-4">
                                <p className="text-sm font-medium text-destructive">
                                    {preview.invalid.length} row{preview.invalid.length === 1 ? '' : 's'} could not be
                                    read
                                </p>
                                <ul className="max-h-32 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                                    {preview.invalid.map((row, i) => (
                                        <li key={`${row.title}-${i}`}>
                                            <span className="text-foreground">{row.title || 'Untitled row'}</span> —{' '}
                                            {row.reason}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {preview.candidates.length === 0 ? (
                        <Empty className="rounded-xl border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <AlertTriangle />
                                </EmptyMedia>
                                <EmptyTitle>No importable listings found</EmptyTitle>
                                <EmptyDescription>
                                    Every row in this file failed to parse. Check the CSV and try again.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="rounded-xl border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                                        </TableHead>
                                        <TableHead className="w-14" />
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Changes</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.candidates.map((c) => (
                                        <TableRow key={c.importKey}>
                                            <TableCell>
                                                <Checkbox
                                                    disabled={c.status === 'SAME'}
                                                    checked={selected.has(c.importKey)}
                                                    onCheckedChange={() => toggle(c.importKey)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {c.imageUrls[0] ? (
                                                    <img
                                                        src={c.imageUrls[0]}
                                                        alt=""
                                                        className="h-10 w-10 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                                                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {c.changedFields.length > 0 ? c.changedFields.join(', ') : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">£{c.price.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="sticky bottom-0 -mx-4 border-t bg-background/95 p-4 backdrop-blur">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {chosen.length} of {selectableKeys.length} importable listings selected
                            </p>
                            <Button disabled={busy || chosen.length === 0} onClick={onCommit}>
                                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                Start import
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NewImport;
