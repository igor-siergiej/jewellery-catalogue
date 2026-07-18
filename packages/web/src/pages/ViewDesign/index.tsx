import { useAuth, useUser } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Edit, ExternalLink, PackageOpen } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getDesignQuery } from '../../api/endpoints/getDesign';
import DesignDescription from '../../components/DesignDescription';
import DesignEditForm from '../../components/DesignEditForm';
import DesignUpdateForm from '../../components/DesignUpdateForm';
import EtsyPushDialog from '../../components/EtsyPushDialog';
import { Image } from '../../components/Image';
import LoadingScreen from '../../components/Loading';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { MATERIALS_PAGE } from '../../constants/routes';
import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import {
    DESIGN_TYPE_LABELS,
    MATERIAL_TYPE_LABELS,
    METAL_TYPE_LABELS,
    WIRE_TYPE_LABELS,
} from '../../lib/materialLabels';
import { cn } from '../../lib/utils';

const ViewDesign = () => {
    const { id } = useParams<{ id: string }>();
    const { accessToken, login, logout } = useAuth();
    const { user } = useUser();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editPropertiesDialogOpen, setEditPropertiesDialogOpen] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);
    const { connected: etsyConnected } = useEtsyConnection();
    const [etsyDialogOpen, setEtsyDialogOpen] = useState(false);

    const {
        data: design,
        isError,
        isLoading,
        refetch,
    } = useQuery({
        ...getDesignQuery(id || '', () => accessToken, login, logout),
        enabled: !!id && !!accessToken && !!user?.id,
    });

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
    } = design ?? {};

    const hasDescription = description && description !== '<p></p>';

    const handleSuccess = () => {
        setEditDialogOpen(false);
        refetch();
    };

    const handleCancel = () => {
        setEditDialogOpen(false);
    };

    const handlePropertiesSuccess = () => {
        setEditPropertiesDialogOpen(false);
        setImageIndex(0);
        refetch();
    };

    const handlePropertiesCancel = () => {
        setEditPropertiesDialogOpen(false);
    };

    if (isLoading || !user?.id) {
        return <LoadingScreen />;
    }

    if (isError || !design) {
        return <span>Design not found</span>;
    }

    return (
        <>
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Page header */}
                <div className="flex items-center justify-between mb-8">
                    <Link
                        to="/designs"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← All Designs
                    </Link>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditPropertiesDialogOpen(true)}
                            title="Edit Design Properties"
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                        </Button>
                        <Button variant="outline" onClick={() => setEditDialogOpen(true)} title="Manage Inventory">
                            <PackageOpen className="h-4 w-4 mr-2" />
                            Manage Inventory
                        </Button>
                        {etsyConnected && (
                            <>
                                {etsy?.listingId && (
                                    <a
                                        href={`https://www.etsy.com/your/shops/me/listing-editor/edit/${etsy.listingId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        {etsy.state === 'active' ? 'Active' : 'Draft'} on Etsy
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!!etsy?.listingId && !etsy.pushIncomplete}
                                    title={
                                        etsy?.listingId && !etsy.pushIncomplete
                                            ? 'This design is already on Etsy'
                                            : undefined
                                    }
                                    onClick={() => setEtsyDialogOpen(true)}
                                >
                                    Send to Etsy
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* 2-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 items-start">
                    {/* LEFT: sticky image */}
                    <div className="lg:sticky lg:top-8 relative">
                        <div className="rounded-xl overflow-hidden border border-border shadow-lg aspect-[3/4] bg-card">
                            {imageIds && imageIds.length > 0 ? (
                                <div
                                    className="flex h-full transition-transform duration-500 ease-in-out"
                                    style={{ transform: `translateX(-${imageIndex * 100}%)` }}
                                >
                                    {imageIds.map((id) => (
                                        <div key={id} className="w-full h-full flex-shrink-0">
                                            <Image imageId={id} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Image imageId="" />
                            )}
                        </div>
                        {imageIds && imageIds.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setImageIndex((i) => Math.max(0, i - 1))}
                                    disabled={imageIndex === 0}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-0 text-white rounded-full p-1.5 transition-all backdrop-blur-sm"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageIndex((i) => Math.min(imageIds.length - 1, i + 1))}
                                    disabled={imageIndex === imageIds.length - 1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-0 text-white rounded-full p-1.5 transition-all backdrop-blur-sm"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {imageIds.map((id, i) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setImageIndex(i)}
                                            className={cn(
                                                'h-1.5 rounded-full transition-all duration-300',
                                                i === imageIndex
                                                    ? 'w-4 bg-white'
                                                    : 'w-1.5 bg-white/50 hover:bg-white/80'
                                            )}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* RIGHT: detail panel */}
                    <div className="flex flex-col gap-8">
                        {/* Identity */}
                        <div className="flex flex-col gap-2">
                            {designType && (
                                <Badge variant="outline" className="w-fit text-xs tracking-widest uppercase">
                                    {DESIGN_TYPE_LABELS[designType]}
                                </Badge>
                            )}
                            <h1 className="text-4xl font-bold leading-tight">{name}</h1>
                            <div className="flex items-baseline gap-3 flex-wrap">
                                {(!variants || variants.length === 0) && (
                                    <span className="text-3xl font-semibold">£{price.toFixed(2)}</span>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                    {totalQuantity ?? 0} in stock
                                </Badge>
                            </div>
                        </div>

                        <div className="h-px bg-border" />

                        {/* Stat cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                                <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                                    Time
                                </span>
                                <span className="text-lg font-semibold">{timeRequired} min</span>
                                <span className="text-xs text-muted-foreground">to make</span>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                                <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                                    Materials
                                </span>
                                <span className="text-lg font-semibold">£{totalMaterialCosts.toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground">cost</span>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                                <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                                    Added
                                </span>
                                <span className="text-lg font-semibold">
                                    {new Date(dateAdded).toLocaleDateString('en-GB', {
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </span>
                                <span className="text-xs text-muted-foreground">date</span>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                                <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                                    Low Stock
                                </span>
                                <span className="text-lg font-semibold">{lowStockThreshold ?? '—'}</span>
                                <span className="text-xs text-muted-foreground">threshold</span>
                            </div>
                        </div>

                        {/* Description */}
                        {hasDescription && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs uppercase tracking-widest font-semibold text-primary whitespace-nowrap">
                                        About this design
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>
                                <DesignDescription html={description} />
                            </div>
                        )}

                        {/* Maker Docs */}
                        {(diagramImageIds && diagramImageIds.length > 0) || makingNotes ? (
                            <div className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
                                <h2 className="text-lg font-medium mb-1">Maker Docs</h2>
                                <p className="text-xs text-muted-foreground mb-4">Private — never shown on Etsy</p>

                                {diagramImageIds && diagramImageIds.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mb-4">
                                        {diagramImageIds.map((id) => (
                                            <div
                                                key={id}
                                                className="w-24 h-24 rounded-md overflow-hidden border border-border"
                                            >
                                                <Image imageId={id} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {makingNotes && <p className="text-sm whitespace-pre-wrap">{makingNotes}</p>}
                            </div>
                        ) : null}

                        {/* Variants */}
                        {variants && variants.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs uppercase tracking-widest font-semibold text-primary">
                                        Variants
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variant</TableHead>
                                            <TableHead>Material Costs</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>In Stock</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variants.map((variant) => (
                                            <TableRow key={variant.id}>
                                                <TableCell className="font-medium">{variant.name}</TableCell>
                                                <TableCell>£{variant.totalMaterialCosts.toFixed(2)}</TableCell>
                                                <TableCell>£{variant.price.toFixed(2)}</TableCell>
                                                <TableCell>{variant.totalQuantity}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Materials */}
                        {materials && materials.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs uppercase tracking-widest font-semibold text-primary">
                                        {variants && variants.length > 0 ? 'Shared Materials' : 'Materials'}
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Material</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Attributes</TableHead>
                                            <TableHead>Required</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materials.map((material) => (
                                            <TableRow key={material.id}>
                                                <TableCell>
                                                    <Link
                                                        to={MATERIALS_PAGE.route}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {material.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {MATERIAL_TYPE_LABELS[material.type]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {material.type === 'BEAD' && material.colour && (
                                                            <Badge variant="secondary" className="capitalize">
                                                                {material.colour}
                                                            </Badge>
                                                        )}
                                                        {(material.type === 'WIRE' ||
                                                            material.type === 'CHAIN' ||
                                                            material.type === 'EAR_HOOK') &&
                                                            material.metalType && (
                                                                <Badge variant="outline">
                                                                    {METAL_TYPE_LABELS[material.metalType]}
                                                                </Badge>
                                                            )}
                                                        {(material.type === 'WIRE' ||
                                                            material.type === 'CHAIN' ||
                                                            material.type === 'EAR_HOOK') &&
                                                            material.wireType && (
                                                                <Badge variant="secondary">
                                                                    {WIRE_TYPE_LABELS[material.wireType]}
                                                                </Badge>
                                                            )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {('requiredLength' in material &&
                                                        `${material.requiredLength} cm`) ||
                                                        ('requiredQuantity' in material &&
                                                            `${material.requiredQuantity} pcs`)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Design Inventory</DialogTitle>
                    </DialogHeader>
                    {design && <DesignUpdateForm design={design} onSuccess={handleSuccess} onCancel={handleCancel} />}
                </DialogContent>
            </Dialog>

            <Dialog open={editPropertiesDialogOpen} onOpenChange={setEditPropertiesDialogOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Design Properties</DialogTitle>
                    </DialogHeader>
                    {design && (
                        <DesignEditForm
                            design={design}
                            onSuccess={handlePropertiesSuccess}
                            onCancel={handlePropertiesCancel}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {design && <EtsyPushDialog design={design} open={etsyDialogOpen} onOpenChange={setEtsyDialogOpen} />}
        </>
    );
};

export default ViewDesign;
