import { Design } from '@jewellery-catalogue/types';
import { ChevronDown, Heart } from 'lucide-react';

import { Image } from '../Image';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter } from '../ui/card';

export interface DesignCardProps {
    design: Design;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design }) => {
    const { name, timeRequired, id, imageId, materials } = design;

    const materialsLabels = materials.map(({ id }) => {
        return (
            <div key={id} className="flex w-full justify-between items-center">
                <span className="text-sm font-medium">
                    id:
                    {' '}
                    {id}
                </span>
                <Button variant="outline" size="sm">Go To Material</Button>
            </div>
        );
    });

    return (
        <Card key={id} className="w-full p-2 mb-6 max-h-96 overflow-hidden">
            <CardContent className="p-4">
                <div className="flex gap-4 flex-nowrap w-full">
                    <div className="h-48 w-48 flex-shrink-0">
                        <Image imageId={imageId} />
                    </div>

                    <div className="flex flex-col gap-2 flex-1">
                        <h2 className="text-xl font-semibold">
                            Name:
                            {' '}
                            {name}
                        </h2>
                        <div className="border-b border-border"></div>
                        <p className="text-base">
                            Price: $15.00
                        </p>

                        <p className="text-base">
                            Time to make:
                            {' '}
                            {timeRequired}
                        </p>

                        <p className="text-base">
                            Material Costs: $10.00
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 flex-1">
                        <h2 className="text-xl font-semibold">
                            Materials
                        </h2>
                        <div className="border-b border-border"></div>
                        <div className="space-y-2">
                            {materialsLabels}
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex w-full gap-2">
                <Button variant="ghost" size="icon">
                    <Heart className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="icon">
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
};
