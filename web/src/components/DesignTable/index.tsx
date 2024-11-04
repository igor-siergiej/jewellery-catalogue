import React from 'react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Design } from '../../types';

export interface DesignTableProps {
    designs: Array<Design>;
}

const DesignTable: React.FC<DesignTableProps> = ({ designs }) => {
    const columns: TableColumn<Design>[] = [
        {
            name: 'Name',
            selector: (row) => row.name,
        },
        {
            name: 'Material',
            selector: (row) => row.material,
        },
        {
            name: 'Price',
            selector: (row) => row.price,
        },
    ];
    return <DataTable columns={columns} data={designs} />;
};

export default DesignTable;
