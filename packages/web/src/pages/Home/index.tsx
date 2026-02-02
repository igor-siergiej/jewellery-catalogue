import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { getDesignsQuery } from '@/api/endpoints/getDesigns';
import { getMaterialsQuery } from '@/api/endpoints/getMaterials';
import LowStockDesignsTable from '@/components/LowStockDesignsTable';
import LowStockMaterialsTable from '@/components/LowStockMaterialsTable';
import LoadingScreen from '@/components/Loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getLowStockDesigns, getLowStockMaterials } from '@/utils/lowStock';

const Home = () => {
    const { accessToken, login, logout } = useAuth();

    const { data: materials, isError: materialsError, refetch: refetchMaterials } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const { data: designs, isError: designsError, refetch: refetchDesigns } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    if (!materials || !designs) {
        return <LoadingScreen />;
    }

    if (materialsError || designsError) {
        return <span>Something went wrong! :(</span>;
    }

    const lowStockMaterials = getLowStockMaterials(materials);
    const lowStockDesigns = getLowStockDesigns(designs);

    const hasAnyLowStock = lowStockMaterials.length > 0 || lowStockDesigns.length > 0;

    const handleRefresh = () => {
        refetchMaterials();
        refetchDesigns();
    };

    if (!hasAnyLowStock) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CheckCircle2 className="text-green-500" />
                        </EmptyMedia>
                        <EmptyTitle>All Stock Levels Good!</EmptyTitle>
                        <EmptyDescription>
                            No items are below their low stock thresholds. Everything is well stocked.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <AlertTriangle className="text-orange-500" />
                    Low Stock Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Items that have fallen below their low stock thresholds
                </p>
            </div>

            {/* Low Stock Materials Section */}
            {lowStockMaterials.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Low Stock Materials ({lowStockMaterials.length})
                        </CardTitle>
                        <CardDescription>
                            {lowStockMaterials.length} material(s) below their low stock threshold
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LowStockMaterialsTable materials={lowStockMaterials} onMaterialUpdated={handleRefresh} />
                    </CardContent>
                </Card>
            )}

            {/* Low Stock Designs Section */}
            {lowStockDesigns.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Low Stock Designs ({lowStockDesigns.length})
                        </CardTitle>
                        <CardDescription>
                            {lowStockDesigns.length} design(s) below their low stock threshold
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LowStockDesignsTable designs={lowStockDesigns} onDesignUpdated={handleRefresh} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Home;
