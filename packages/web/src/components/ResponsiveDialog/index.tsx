import { type ReactNode, useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const MOBILE_BREAKPOINT = 768;

interface ResponsiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    /** Extra classes for the desktop dialog, e.g. a wider max width. */
    className?: string;
}

const FOOTER_CLASS = 'flex flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-between';

export function ResponsiveDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className,
}: ResponsiveDialogProps) {
    const isMobile = useIsMobile();
    // Swapping Dialog and Drawer remounts the body, so the variant is fixed for as long as it stays open
    const [openedOnMobile, setOpenedOnMobile] = useState<boolean | null>(null);

    if (open && openedOnMobile === null) setOpenedOnMobile(window.innerWidth < MOBILE_BREAKPOINT);

    if (!open && openedOnMobile !== null) setOpenedOnMobile(null);

    const mobile = open ? (openedOnMobile ?? window.innerWidth < MOBILE_BREAKPOINT) : isMobile;

    if (mobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
                <DrawerContent
                    className="overflow-hidden"
                    style={{ maxHeight: 'min(90dvh, calc(100vh - env(keyboard-inset-height, 0px) - 2rem))' }}
                >
                    <DrawerHeader>
                        <DrawerTitle>{title}</DrawerTitle>
                        {description ? (
                            <DrawerDescription>{description}</DrawerDescription>
                        ) : (
                            <DrawerDescription className="sr-only">{title}</DrawerDescription>
                        )}
                    </DrawerHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
                    {footer && <div className={FOOTER_CLASS}>{footer}</div>}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn('flex max-h-[90vh] flex-col gap-0 p-0', className)}>
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
