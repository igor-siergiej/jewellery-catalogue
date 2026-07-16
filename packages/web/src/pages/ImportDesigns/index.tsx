import { useAuth } from '@imapps/web-utils';
import type { ImportCandidate, ImportPreviewResult } from '@jewellery-catalogue/types';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { makeCommitImportRequest, makePreviewImportRequest } from '../../api/endpoints/importDesigns';
import { DESIGNS_PAGE } from '../../constants/routes';

const ImportDesigns: React.FC = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultMsg, setResultMsg] = useState<string | null>(null);
    const [failedNames, setFailedNames] = useState<string[]>([]);

    const token = () => accessToken;

    const onFile = async (file: File) => {
        setBusy(true);
        setError(null);
        setResultMsg(null);
        setFailedNames([]);
        try {
            const res = await makePreviewImportRequest(file, token, login, logout);
            setPreview(res);
            // default: NEW checked, CHANGED unchecked
            setSelected(new Set(res.candidates.filter((c) => c.status === 'NEW').map((c) => c.importKey)));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Preview failed');
        } finally {
            setBusy(false);
        }
    };

    const toggle = (key: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const selectable = (c: ImportCandidate) => c.status !== 'SAME';

    const chosen = useMemo(
        () => (preview?.candidates ?? []).filter((c) => selected.has(c.importKey)),
        [preview, selected]
    );

    const onCommit = async () => {
        if (chosen.length === 0) return;
        setBusy(true);
        setError(null);
        try {
            const res = await makeCommitImportRequest({ candidates: chosen }, token, login, logout);
            await queryClient.invalidateQueries({ queryKey: ['designs'] });
            setResultMsg(`Created ${res.created}, updated ${res.updated}, failed ${res.failed.length}.`);
            setFailedNames(res.failed.map((f) => f.name));
            setPreview(null);
            setSelected(new Set());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Import failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Import from Etsy</h1>
                <Button variant="outline" onClick={() => navigate(DESIGNS_PAGE.route)}>
                    Back to designs
                </Button>
            </div>

            <input
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                }}
            />

            {error && <p className="text-destructive">{error}</p>}
            {resultMsg && <p className="text-green-600">{resultMsg}</p>}
            {failedNames.length > 0 && (
                <ul className="text-sm text-destructive list-disc pl-5">
                    {failedNames.map((n) => (
                        <li key={n}>{n}</li>
                    ))}
                </ul>
            )}

            {preview && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {preview.summary.new} new · {preview.summary.changed} changed · {preview.summary.same} unchanged
                        · {preview.summary.invalid} invalid
                    </p>
                    <div className="border rounded-md divide-y">
                        {preview.candidates.map((c) => (
                            <label key={c.importKey} className="flex items-center gap-3 p-2">
                                <input
                                    type="checkbox"
                                    disabled={!selectable(c)}
                                    checked={selected.has(c.importKey)}
                                    onChange={() => toggle(c.importKey)}
                                />
                                {c.imageUrls[0] && (
                                    <img src={c.imageUrls[0]} alt="" className="w-12 h-12 object-cover rounded" />
                                )}
                                <span className="flex-1">{c.name}</span>
                                <span className="text-xs uppercase text-muted-foreground">{c.status}</span>
                                {c.status === 'CHANGED' && (
                                    <span className="text-xs text-amber-600">{c.changedFields.join(', ')}</span>
                                )}
                                <span className="text-sm">£{c.price}</span>
                            </label>
                        ))}
                    </div>
                    <Button disabled={busy || chosen.length === 0} onClick={onCommit}>
                        Import {chosen.length} selected
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ImportDesigns;
