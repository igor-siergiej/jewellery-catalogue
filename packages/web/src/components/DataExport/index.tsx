import { useAuth } from '@imapps/web-utils';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EXPORTS = [
    { path: '/api/export/materials.csv', label: 'Materials (CSV)' },
    { path: '/api/export/designs.csv', label: 'Designs (CSV)' },
    { path: '/api/export/backup.json', label: 'Full backup (JSON)' },
] as const;

// The server names the file via Content-Disposition; fall back to the path's last segment.
const filenameFrom = (response: Response, path: string) =>
    response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? path.split('/').pop() ?? 'export';

export const DataExport = () => {
    const { accessToken } = useAuth();
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState(false);

    const download = async (path: string) => {
        setBusy(path);
        setError(false);
        try {
            const response = await fetch(path, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!response.ok) throw new Error(`Export failed ${response.status}`);
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement('a');
            link.href = url;
            link.download = filenameFrom(response, path);
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            setError(true);
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    Download your materials and designs as spreadsheets, or everything as a JSON backup. Etsy login
                    details are never included.
                </p>
                <div className="flex flex-wrap gap-2">
                    {EXPORTS.map(({ path, label }) => (
                        <Button key={path} variant="outline" disabled={busy !== null} onClick={() => download(path)}>
                            {busy === path ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {label}
                        </Button>
                    ))}
                </div>
                {error && <p className="text-sm text-destructive">Couldn't download the export. Try again.</p>}
            </CardContent>
        </Card>
    );
};
