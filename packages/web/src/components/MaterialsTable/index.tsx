import { Material } from 'types';
import MUIDataTable, {
    MUIDataTableColumn,
    MUIDataTableOptions,
} from 'mui-datatables';

export interface IMaterialTableProps {
    materials: Array<Material>;
}

const MaterialsTable: React.FC<IMaterialTableProps> = ({ materials }) => {
    const columns: Array<MUIDataTableColumn> = [
        {
            name: 'name',
            label: 'Name',
        },
        {
            label: 'Brand',
            name: 'brand',
        },
        {
            label: 'Type',
            name: 'type',
        },
        {
            label: 'Diameter',
            name: 'diameter',
        },
        {
            label: 'URL',
            name: 'purchaseUrl',
        },
        {
            label: 'Quantity',
            name: 'quantity',
        },
        {
            label: 'Colour',
            name: 'colour',
        },
        {
            label: 'Wire Type',
            name: 'wireType',
        },
        {
            label: 'Metal Type',
            name: 'metalType',
        },
        {
            label: 'Price Per Meter',
            name: 'pricePerMeter',
        },
        // TODO: Add price per bead here
    ];

    const tableOptions: MUIDataTableOptions = {
        print: false,
        download: false,
    };

    return (
        <MUIDataTable
            title="Materials"
            data={materials}
            columns={columns}
            options={tableOptions}
        />
    );
};

export default MaterialsTable;
