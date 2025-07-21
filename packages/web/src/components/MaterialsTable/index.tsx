import { Material } from '@jewellery-catalogue/types';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

export interface IMaterialTableProps {
    materials: Array<Material>;
}

const MaterialsTable: React.FC<IMaterialTableProps> = ({ materials }) => {
    const columns: Array<GridColDef> = [
        {
            field: 'name',
            headerName: 'Name',
            width: 150,
        },
        {
            field: 'brand',
            headerName: 'Brand',
            width: 150,
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
        },
        {
            field: 'diameter',
            headerName: 'Diameter',
            width: 120,
        },
        {
            field: 'purchaseUrl',
            headerName: 'URL',
            width: 200,
            renderCell: params => (
                <a
                    href={params.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                >
                    {params.value ? 'View' : ''}
                </a>
            ),
        },
        {
            field: 'quantity',
            headerName: 'Quantity',
            width: 120,
            type: 'number',
        },
        {
            field: 'colour',
            headerName: 'Colour',
            width: 120,
        },
        {
            field: 'wireType',
            headerName: 'Wire Type',
            width: 120,
        },
        {
            field: 'metalType',
            headerName: 'Metal Type',
            width: 120,
        },
        {
            field: 'pricePerMeter',
            headerName: 'Price Per Meter',
            width: 150,
            type: 'number',
            valueFormatter: (value) => {
                if (value == null) return '';
                return `$${Number(value).toFixed(2)}`;
            },
        },
        // TODO: Add price per bead here
    ];

    // Add unique IDs to materials for DataGrid
    const materialsWithIds = materials.map((material, index) => ({
        ...material,
        id: material.id || `material-${index}`, // Use existing ID or create one
    }));

    return (
        <div style={{ height: 600, width: '100%' }}>
            <DataGrid
                rows={materialsWithIds}
                columns={columns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 10 },
                    },
                }}
                disableRowSelectionOnClick
                sx={{
                    '& .MuiDataGrid-root': {
                        border: 'none',
                    },
                }}
            />
        </div>
    );
};

export default MaterialsTable;
