import { FormDesign, Material } from "@jewellery-catalogue/types";
import { GridRowModesModel } from "@mui/x-data-grid/models";
import { UseFormSetValue } from "react-hook-form";

export type TableMaterial = Pick<Material, 'id' | 'name' | 'quantity'> & { isNew?: boolean };

export interface AddMaterialsTableProps {
    setValue: UseFormSetValue<FormDesign>;
    availableMaterials: Array<Material>;
}

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        setRows: React.Dispatch<React.SetStateAction<ReadonlyArray<TableMaterial>>>;
        setRowModesModel: React.Dispatch<React.SetStateAction<GridRowModesModel>>;
    }
}
