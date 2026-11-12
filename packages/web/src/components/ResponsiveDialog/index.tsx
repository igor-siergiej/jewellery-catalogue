import type { ReactNode } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
}

const FOOTER_CLASS = 'flex flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-between';

export function ResponsiveDialog({ open, onOpenChange, title, description, children, footer }: ResponsiveDialogProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
                <DrawerContent className="max-h-[90dvh]">
                    <DrawerHeader>
                        <DrawerTitle>{title}</DrawerTitle>
                        {description ? (
                            <DrawerDescription>{description}</DrawerDescription>
                        ) : (
                            <DrawerDescription className="sr-only">{title}</DrawerDescription>
                        )}
                    </DrawerHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
                    {footer && <div className={`${FOOTER_CLASS} sticky bottom-0`}>{footer}</div>}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0">
                <DialogHeader className="px-6 pb-4 pt-6">
                    <DialogTitle>{title}</DialogTitle>
                    {description ? (
                        <DialogDescription>{description}</DialogDescription>
                    ) : (
                        <DialogDescription className="sr-only">{title}</DialogDescription>
                    )}
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">{children}</div>
                {footer && <div className={`${FOOTER_CLASS} px-6`}>{footer}</div>}
            </DialogContent>
        </Dialog>
    );
}
