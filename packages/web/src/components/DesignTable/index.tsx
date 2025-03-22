import React from 'react';
import { Design } from '../../types';
import MUIDataTable, {
    MUIDataTableColumn,
    MUIDataTableOptions,
} from 'mui-datatables';

export interface DesignTableProps {
    designs: Array<Design>;
}

const DesignTable: React.FC<DesignTableProps> = ({ designs }) => {
    const columns: Array<MUIDataTableColumn> = [
        {
            name: 'name',
            label: 'Name',
        },
        {
            label: 'Price',
            name: 'price',
        },
        {
            label: 'Material',
            name: 'material',
        },
    ];

    const tableOptions: MUIDataTableOptions = {
        print: false,
        download: false,
    };

    return (
        <MUIDataTable
            title={'Designs'}
            data={designs}
            columns={columns}
            options={tableOptions}
        />
    );
};

export default DesignTable;
