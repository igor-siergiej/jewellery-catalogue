import { Plus, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { SHOPPING_LIST_PAGE } from '../../constants/routes';

interface ListPageHeaderProps {
    title: string;
    addLabel: string;
    addRoute: string;
}

export const ListPageHeader: React.FC<ListPageHeaderProps> = ({ title, addLabel, addRoute }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
                <Link to={SHOPPING_LIST_PAGE.route}>
                    <ShoppingCart /> Shopping list
                </Link>
            </Button>
            <Button asChild>
                <Link to={addRoute}>
                    <Plus /> {addLabel}
                </Link>
            </Button>
        </div>
    </div>
);
