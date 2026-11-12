import { useAuth, useUser } from '@imapps/web-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Edit, ExternalLink, PackageOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { useSearch } from '@/context/SearchContext';
import { track } from '@/utils/analytics';

import { getDesignQuery } from '../../api/endpoints/getDesign';
import DesignDescription from '../../components/DesignDescription';
import EditDesignDialog from '../../components/EditDesignDialog';
import EtsyPushDialog from '../../components/EtsyPushDialog';
import { Image } from '../../components/Image';
import InventoryDialog from '../../components/InventoryDialog';
import { PriceAdvice } from '../../components/PriceAdvice';
import { StateView } from '../../components/StateView';
import { EtsyStatusTag, StatusTag } from '../../components/StatusTag';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { MATERIALS_PAGE } from '../../constants/routes';
import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import { useEtsyStatus } from '../../hooks/useEtsyStatus';
import { PRODUCIBLE_QUERY_KEY, useProducible } from '../../hooks/useProducible';
import { describeDuration } from '../../lib/duration';
import { etsyListingUrl, getEtsyAction, getEtsyStatus } from '../../lib/etsyStatus';
import {
    DESIGN_TYPE_LABELS,
    MATERIAL_TYPE_LABELS,
    METAL_TYPE_LABELS,
    WIRE_TYPE_LABELS,
} from '../../lib/materialLabels';
import { cn } from '../../lib/utils';
import { canMakeLabel } from '../../utils/canMakeLabel';

const ViewDesign = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { searchQuery } = useSearch();
    const { accessToken, login, logout } = useAuth();
    const { user } = useUser();
    const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);
    const { connected: etsyConnected } = useEtsyConnection();
    const [etsyDialogOpen, setEtsyDialogOpen] = useState(false);
    const trackedDesignId = useRef<string | null>(null);

    const {
        data: design,
        isError,
        isLoading,
        refetch,
    } = useQuery({
        ...getDesignQuery(id || '', () => accessToken, login, logout),
        enabled: !!id && !!accessToken && !!user?.id,
    });

    useEffect(() => {
        if (!design?.id || trackedDesignId.current === design.id) return;
        trackedDesignId.current = design.id;
        const from = (location.state as { from?: string } | null)?.from;
        track('design_viewed', { designId: design.id, source: searchQuery ? 'search' : (from ?? 'direct') });
    }, [design?.id, location.state, searchQuery]);

    const {
        timeRequired,
        imageIds,
        name,
        materials,
        totalMaterialCosts,
        price,
        dateAdded,
        totalQuantity,
        variants,
        description,
        lowStockThreshold,
        designType,
        diagramImageIds,
        makingNotes,
        etsy,
        catalogueOnly,
    } = design ?? {};

    useEtsyStatus(id ?? '', !!id && !!etsy?.listingId);
    const queryClient = useQueryClient();
    const producible = useProducible().get(id ?? '');
    const canMake = canMakeLabel(producible);
    const variantCanMake = new Map(producible?.variants.map((v) => [v.variantId, v.canMake]));

    const hasDescription = description && description !== '<p></p>';

    const handleInventorySuccess = () => {
        setInventoryDialogOpen(false);
        refetch();
        queryClient.invalidateQueries({ queryKey: PRODUCIBLE_QUERY_KEY });
    };

    const handleEditSuccess = () => {
        setEditDialogOpen(false);
        setImageIndex(0);
        refetch();
        queryClient.invalidateQueries({ queryKey: PRODUCIBLE_QUERY_KEY });
    };

    if (isLoading || !user?.id) {
        return <StateView kind="loading" what="design" />;
    }

    if (isError || !design) {
        return (
            <StateView
                kind="empty"
                title="Design not found"
                body="It may have been deleted, or the link may be wrong."
                action={
                    <Button asChild variant="outline">
                        <Link to="/designs">All designs</Link>
                    </Button>
                }
            />
        );
    }

    const etsyStatus = getEtsyStatus(design);
    const etsyActions = getEtsyAction(design, etsyConnected);
    const showEtsyBlock = etsyActions.length > 0 || etsyStatus !== 'none';
    const canSendToEtsy = etsyActions.includes('send');

    return (
        <>
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
                    <Link
                        to="/designs"
                        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="size-4" aria-hidden />
                        All designs
                    </Link>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                            <Edit className="size-4" aria-hidden />
                            Edit design
                        </Button>
                        <Button variant="outline" onClick={() => setInventoryDialogOpen(true)}>
                            <PackageOpen className="size-4" aria-hidden />
                            Manage inventory
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
                    <div className="relative lg:sticky lg:top-8">
                        <div className="aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card">
                            {imageIds && imageIds.length > 0 ? (
                                <div
                                    className="flex h-full transition-transform duration-500 ease-in-out"
                                    style={{ transform: `translateX(-${imageIndex * 100}%)` }}
                                >
                                    {imageIds.map((imageId) => (
                                        <div key={imageId} className="h-full w-full flex-shrink-0">
                                            <Image imageId={imageId} size="display" />
                                        </div>
                                    ))}
                                </div>
                            ) : etsy?.imageUrls && etsy.imageUrls.length > 0 ? (
                                <img src={etsy.imageUrls[0]} alt={name} className="h-full w-full object-cover" />
                            ) : (
                                <Image imageId="" />
                            )}
                        </div>
                        {imageIds && imageIds.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Previous photo"
                                    onClick={() => setImageIndex((i) => Math.max(0, i - 1))}
                                    disabled={imageIndex === 0}
                                    className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition-opacity hover:bg-card disabled:pointer-events-none disabled:opacity-0"
                                >
                                    <ChevronLeft className="size-5" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next photo"
                                    onClick={() => setImageIndex((i) => Math.min(imageIds.length - 1, i + 1))}
                                    disabled={imageIndex === imageIds.length - 1}
                                    className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition-opacity hover:bg-card disabled:pointer-events-none disabled:opacity-0"
                                >
                                    <ChevronRight className="size-5" aria-hidden />
                                </button>
                                <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2">
                                    {imageIds.map((imageId, i) => (
                                        <button
                                            key={imageId}
                                            type="button"
                                            aria-label={`Show photo ${i + 1} of ${imageIds.length}`}
                                            aria-current={i === imageIndex}
                                            onClick={() => setImageIndex(i)}
                                            className="flex size-6 items-center justify-center"
                                        >
                                            <span
                                                className={cn(
                                                    'h-1.5 rounded-full border border-border transition-all',
                                                    i === imageIndex ? 'w-4 bg-primary' : 'w-1.5 bg-card'
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-8">
                        <div className="flex flex-col gap-2">
                            {designType && (
                                <p className="text-sm text-muted-foreground">{DESIGN_TYPE_LABELS[designType]}</p>
                            )}
                            <h1 className="font-display text-4xl font-semibold leading-tight">{name}</h1>
                            {(!variants || variants.length === 0) && (
                                <p className="text-3xl font-semibold">£{price.toFixed(2)}</p>
                            )}
                            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span>{totalQuantity ?? 0} in stock</span>
                                {canMake && <span data-testid="can-make">{canMake}</span>}
                            </p>
                        </div>

                        {showEtsyBlock && (
                            <section
                                aria-label="Etsy"
                                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
                            >
                                {etsyActions.includes('catalogue-only') ? (
                                    <p className="text-sm">Catalogue only, not sent to Etsy</p>
                                ) : (
                                    <>
                                        <EtsyStatusTag status={etsyStatus} />
                                        {canSendToEtsy && (
                                            <Button type="button" onClick={() => setEtsyDialogOpen(true)}>
                                                Send to Etsy
                                            </Button>
                                        )}
                                        {etsyActions.includes('view') && etsy?.listingId && (
                                            <Button asChild variant="outline">
                                                <a
                                                    href={etsyListingUrl(etsy.listingId)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View on Etsy
                                                    <ExternalLink className="size-4" aria-hidden />
                                                </a>
                                            </Button>
                                        )}
                                        {canSendToEtsy && etsy?.pushIncomplete && (
                                            <p className="basis-full text-sm text-muted-foreground">
                                                Some photos or stock haven't been sent to Etsy yet
                                            </p>
                                        )}
                                    </>
                                )}
                            </section>
                        )}

                        <dl className="max-w-md text-sm">
                            {[
                                ['Time to make', describeDuration(timeRequired)],
                                ['Material cost', `£${totalMaterialCosts.toFixed(2)}`],
                                [
                                    'Added',
                                    new Date(dateAdded).toLocaleDateString('en-GB', {
                                        month: 'short',
                                        year: 'numeric',
                                    }),
                                ],
                                ['Low-stock alert', lowStockThreshold ?? 'Not set'],
                            ].map(([term, value]) => (
                                <div
                                    key={term}
                                    className="flex justify-between gap-4 border-b border-border py-2 first:pt-0"
                                >
                                    <dt className="text-muted-foreground">{term}</dt>
                                    <dd className="font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>

                        {id && <PriceAdvice designId={id} />}

                        {hasDescription && (
                            <section className="flex flex-col gap-3">
                                <h2 className="text-base font-semibold">About this design</h2>
                                <DesignDescription html={description} />
                            </section>
                        )}

                        {(diagramImageIds && diagramImageIds.length > 0) || makingNotes ? (
                            <section className="rounded-lg border border-border bg-card p-4">
                                <h2 className="text-base font-semibold">Maker docs</h2>
                                <p className="mb-4 text-sm text-muted-foreground">Private, never shown on Etsy</p>

                                {diagramImageIds && diagramImageIds.length > 0 && (
                                    <div className="mb-4 flex flex-wrap gap-3">
                                        {diagramImageIds.map((diagramId) => (
                                            <div
                                                key={diagramId}
                                                className="size-24 overflow-hidden rounded-md border border-border"
                                            >
                                                <Image imageId={diagramId} size="display" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {makingNotes && <p className="whitespace-pre-wrap text-sm">{makingNotes}</p>}
                            </section>
                        ) : null}

                        {variants && variants.length > 0 && (
                            <section className="flex flex-col gap-3">
                                <h2 className="text-base font-semibold">Variants</h2>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead>Variant</TableHead>
                                            <TableHead data-numeric>Material cost</TableHead>
                                            <TableHead data-numeric>Price</TableHead>
                                            <TableHead data-numeric>In stock</TableHead>
                                            <TableHead data-numeric>Can make</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variants.map((variant) => (
                                            <TableRow key={variant.id}>
                                                <TableCell
                                                    data-name
                                                    title={variant.name}
                                                    className="w-full font-medium"
                                                >
                                                    {variant.name}
                                                </TableCell>
                                                <TableCell data-numeric>
                                                    £{variant.totalMaterialCosts.toFixed(2)}
                                                </TableCell>
                                                <TableCell data-numeric>£{variant.price.toFixed(2)}</TableCell>
                                                <TableCell data-numeric>{variant.totalQuantity}</TableCell>
                                                <TableCell data-numeric>
                                                    {variantCanMake.get(variant.id) ?? '–'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </section>
                        )}

                        {materials && materials.length > 0 && (
                            <section className="flex flex-col gap-3">
                                <h2 className="text-base font-semibold">
                                    {variants && variants.length > 0 ? 'Shared materials' : 'Materials'}
                                </h2>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead>Material</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Attributes</TableHead>
                                            <TableHead data-numeric>Required</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materials.map((material) => {
                                            const isMetal =
                                                material.type === 'WIRE' ||
                                                material.type === 'CHAIN' ||
                                                material.type === 'EAR_HOOK';

                                            return (
                                                <TableRow key={material.id}>
                                                    <TableCell data-name title={material.name} className="w-1/3">
                                                        <Link
                                                            to={MATERIALS_PAGE.route}
                                                            className="text-primary hover:underline"
                                                        >
                                                            {material.name}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>{MATERIAL_TYPE_LABELS[material.type]}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {material.type === 'BEAD' && material.colour && (
                                                                <StatusTag>{material.colour}</StatusTag>
                                                            )}
                                                            {isMetal && material.metalType && (
                                                                <StatusTag>
                                                                    {METAL_TYPE_LABELS[material.metalType]}
                                                                </StatusTag>
                                                            )}
                                                            {isMetal && material.wireType && (
                                                                <StatusTag>
                                                                    {WIRE_TYPE_LABELS[material.wireType]}
                                                                </StatusTag>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell data-numeric>
                                                        {('requiredLength' in material &&
                                                            `${material.requiredLength} cm`) ||
                                                            ('requiredQuantity' in material &&
                                                                `${material.requiredQuantity} pcs`)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </section>
                        )}
                    </div>
                </div>
            </div>

            <InventoryDialog
                design={design}
                open={inventoryDialogOpen}
                onOpenChange={setInventoryDialogOpen}
                onSuccess={handleInventorySuccess}
            />

            {editDialogOpen && (
                <EditDesignDialog design={design} open onOpenChange={setEditDialogOpen} onSuccess={handleEditSuccess} />
            )}

            <EtsyPushDialog design={design} open={etsyDialogOpen} onOpenChange={setEtsyDialogOpen} />
        </>
    );
};

export default ViewDesign;
