import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { getDesignsQuery } from '@/api/endpoints/getDesigns';
import { getMaterialsQuery } from '@/api/endpoints/getMaterials';
import { SalesDashboard } from '@/components/SalesDashboard';
import { StateView } from '@/components/StateView';
import { StockLedger } from '@/components/StockLedger';
import { StockSidePanel } from '@/components/StockSidePanel';
import { Button } from '@/components/ui/button';
import { ADD_DESIGN_PAGE } from '@/constants/routes';
import { useEtsyConnection } from '@/hooks/useEtsyConnection';
import { useEtsyListings } from '@/hooks/useEtsyListings';
import { useProducible } from '@/hooks/useProducible';
import { isNotOnEtsyYet } from '@/lib/etsyStatus';
import { buildStockRows, type StockRow } from '@/lib/stockLedger';
import { getLowStockMaterials } from '@/utils/lowStock';

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

const summarise = (rows: StockRow[]) => {
    const out = rows.filter((r) => r.severity === 'out').length;
    const low = rows.filter((r) => r.severity === 'low').length;

    const parts = [
        out > 0 && `${plural(out, 'design')} out of stock`,
        low > 0 && `${plural(low, 'design')} running low`,
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : 'Everything is in stock';
};

const AddDesignButton = () => (
    <Button asChild className="min-h-11 md:min-h-9">
        <Link to={ADD_DESIGN_PAGE.route}>
            <Plus />
            Add design
        </Link>
    </Button>
);

const Home = () => {
    const { accessToken, login, logout } = useAuth();
    const producible = useProducible();
    const { connected: etsyConnected } = useEtsyConnection();
    const { listings, isError: listingsError } = useEtsyListings(etsyConnected);

    const designsQuery = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const { data: materials } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const designs = designsQuery.data;
    const rows = useMemo(() => (designs ? buildStockRows(designs, producible) : []), [designs, producible]);

    if (designsQuery.isError) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="error" what="your stock" onRetry={() => designsQuery.refetch()} />
            </div>
        );
    }

    if (!designs) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="loading" what="your stock" />
            </div>
        );
    }

    const unlinkedListingsCount =
        etsyConnected && !listingsError ? listings.filter((l) => l.linkedDesignId === null).length : null;

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="font-display text-3xl font-semibold">Stock</h1>
                    {rows.length > 0 && <p className="text-sm text-muted-foreground">{summarise(rows)}</p>}
                </div>
                {rows.length > 0 && <AddDesignButton />}
            </div>

            {rows.length === 0 ? (
                <StateView
                    kind="empty"
                    title="No designs yet"
                    body="Add your first design to start tracking stock."
                    action={<AddDesignButton />}
                />
            ) : (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <StockLedger rows={rows} />
                    <StockSidePanel
                        notOnEtsyCount={designs.filter(isNotOnEtsyYet).length}
                        unlinkedListingsCount={unlinkedListingsCount}
                        lowMaterials={getLowStockMaterials(materials ?? [])}
                    />
                </div>
            )}

            {etsyConnected && <SalesDashboard />}
        </div>
    );
};

export default Home;
