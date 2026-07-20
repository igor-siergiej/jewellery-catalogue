import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { useEtsyReconcile } from '../../hooks/useEtsyReconcile';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

interface LinkDesignDialogProps {
    listingId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLinked: () => void;
}

export const LinkDesignDialog: React.FC<LinkDesignDialogProps> = ({ listingId, open, onOpenChange, onLinked }) => {
    const { accessToken, login, logout } = useAuth();
    const { linkToDesign, isLinking } = useEtsyReconcile();

    const { data: designs } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: open && !!accessToken,
    });

    const unlinked = (designs ?? []).filter((d) => !d.etsy?.listingId);

    const handleLink = async (designId: string) => {
        await linkToDesign({ listingId, designId });
        onLinked();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link an existing design</DialogTitle>
                    <DialogDescription>Pick a design to link to this Etsy listing.</DialogDescription>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto divide-y">
                    {unlinked.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No unlinked designs available.</p>
                    ) : (
                        unlinked.map((d) => (
                            <div key={d.id} className="flex items-center justify-between py-2">
                                <span className="text-sm">{d.name}</span>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={isLinking}
                                    onClick={() => handleLink(d.id)}
                                >
                                    Link
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
