import React from 'react';
import { Design } from '@jewellery-catalogue/types';

export interface DesignTableProps {
    designs: Array<Design>;
}

const DesignTable: React.FC<DesignTableProps> = ({ designs }) => {
    return (
        <div>
            {designs.map((design) => {
                return (<span>{`${design.name}, ${design.description}, ${design.materials[0].name}`}</span>)
            })}
        </div>
    )
};

export default DesignTable;
