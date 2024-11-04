import DataTable, { TableColumn } from 'react-data-table-component';
import { Material } from '../../types';

export interface IMaterialTableProps {
    materials: Array<Material>;
}

const MaterialsTable: React.FC<IMaterialTableProps> = ({ materials }) => {
    const columns: TableColumn<Material>[] = [
        {
            name: 'Name',
            selector: (row) => row.name,
        },
    ];
    return <DataTable columns={columns} data={materials} />;
};

export default MaterialsTable;
