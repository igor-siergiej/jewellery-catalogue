import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';

import { getDesignsQuery } from '@/api/endpoints/getDesigns';
import { DesignThumb } from '@/components/DesignThumb';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { StateView } from '@/components/StateView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEtsyReconcile } from '@/hooks/useEtsyReconcile';

interface LinkDesignDialogProps {
    listingId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLinked: () => void;
}

export const LinkDesignDialog: React.FC<LinkDesignDialogProps> = ({ listingId, open, onOpenChange, onLinked }) => {
    const { accessToken, login, logout } = useAuth();
    const { linkToDesign, isLinking } = useEtsyReconcile();
    const [search, setSearch] = useState('');

    const {
        data: designs,
        isError,
        refetch,
    } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: open && !!accessToken,
    });

    const unlinked = (designs ?? []).filter((d) => !d.etsy?.listingId);
    const term = search.trim().toLowerCase();
    const matching = term ? unlinked.filter((d) => d.name.toLowerCase().includes(term)) : unlinked;

    const handleLink = async (designId: string) => {
        await linkToDesign({ listingId, designId });
        onLinked();
        onOpenChange(false);
    };

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Link an existing design"
            description="Pick a design to link to this Etsy listing."
            footer={
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 md:min-h-9"
                    onClick={() => onOpenChange(false)}
                >
                    Cancel
                </Button>
            }
        >
            {isError ? (
                <StateView kind="error" what="your designs" onRetry={() => refetch()} />
            ) : !designs ? (
                <StateView kind="loading" what="your designs" />
            ) : unlinked.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No unlinked designs available.</p>
            ) : (
                <div className="space-y-3">
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            aria-label="Search designs"
                            placeholder="Search designs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-11 bg-card pl-9 md:h-9"
                        />
                    </div>
                    {matching.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">No designs match your search.</p>
                    ) : (
                        <ul className="divide-y rounded-md border bg-card" aria-label="Unlinked designs">
                            {matching.map((d) => (
                                <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                                    <DesignThumb design={d} />
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium" title={d.name}>
                                        {d.name}
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="min-h-11 md:min-h-8"
                                        aria-label={`Link ${d.name}`}
                                        disabled={isLinking}
                                        onClick={() => handleLink(d.id)}
                                    >
                                        Link
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </ResponsiveDialog>
    );
};
