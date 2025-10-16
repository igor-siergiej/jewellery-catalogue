import { useAuth, useUser } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import { Edit, Settings } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { getDesignQuery } from '../../api/endpoints/getDesign';
import DesignEditForm from '../../components/DesignEditForm';
import DesignUpdateForm from '../../components/DesignUpdateForm';
import { Image } from '../../components/Image';
import LoadingScreen from '../../components/Loading';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const ViewDesign = () => {
    const { id } = useParams<{ id: string }>();
    const { accessToken, login, logout } = useAuth();
    const { user } = useUser();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editPropertiesDialogOpen, setEditPropertiesDialogOpen] = useState(false);

    const {
        data: design,
        isError,
        isLoading,
        refetch,
    } = useQuery({
        ...getDesignQuery(id || '', () => accessToken, login, logout),
        enabled: !!id && !!accessToken && !!user?.id,
    });

    const { timeRequired, imageId, name, materials, totalMaterialCosts, price, dateAdded, totalQuantity } =
        design ?? {};

    const handleEditClick = () => {
        setEditDialogOpen(true);
    };

    const handleSuccess = () => {
        setEditDialogOpen(false);
        refetch();
    };

    const handleCancel = () => {
        setEditDialogOpen(false);
    };

    const handleEditPropertiesClick = () => {
        setEditPropertiesDialogOpen(true);
    };

    const handlePropertiesSuccess = () => {
        setEditPropertiesDialogOpen(false);
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
            <div className="flex justify-center items-start p-8">
                <div className="bg-card rounded-lg border border-border shadow-lg overflow-hidden max-w-2xl w-full">
                    <div className="w-full h-96 relative">
                        <Image imageId={imageId} />
                        <div className="absolute top-4 right-4 flex gap-2">
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={handleEditPropertiesClick}
                                title="Edit Design Properties"
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="secondary" size="icon" onClick={handleEditClick} title="Manage Inventory">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <h1 className="text-3xl font-bold">{name}</h1>

                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div>
                                    <span className="text-sm font-semibold">Time Required:</span>
                                    <p className="text-lg">{timeRequired} minutes</p>
                                </div>
                                <div>
                                    <span className="text-sm font-semibold">Material Costs:</span>
                                    <p className="text-lg">£{totalMaterialCosts.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-semibold">Price:</span>
                                    <p className="text-lg">£{price.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-semibold">In Stock:</span>
                                    <p className="text-lg">{totalQuantity ?? 0} designs</p>
                                </div>
                                <div>
                                    <span className="text-sm font-semibold">Date Added:</span>
                                    <p className="text-lg">{new Date(dateAdded).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {materials && materials.length > 0 && (
                                <div className="pt-4">
                                    <h2 className="text-xl font-semibold mb-2">Materials</h2>
                                    <ul className="space-y-2">
                                        {materials.map((material) => (
                                            <li key={material.id} className="text-sm border-l-2 border-primary pl-3">
                                                <div className="font-medium">{material.name}</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {'requiredLength' in material && `${material.requiredLength} cm`}
                                                    {'requiredQuantity' in material &&
                                                        `${material.requiredQuantity} pieces`}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
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
        </>
    );
};

export default ViewDesign;
