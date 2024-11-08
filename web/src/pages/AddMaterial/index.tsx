import { SubmitHandler, useForm } from 'react-hook-form';
import { Button, TextField, Typography } from '@mui/material';
import MaterialFormResolver from '../../components/MaterialFormResolver';
import DropDown from '../../components/DropDown';
import { Bead, MaterialType, Wire } from '../../types';
import { IFormBead, IFormMaterial, IFormWire } from './types';

const AddMaterial = () => {
    const { control, handleSubmit, register, watch } = useForm<IFormMaterial>();

    const currentMaterialType = watch('type');

    const onSubmit: SubmitHandler<IFormMaterial> = (data) => {
        const material = convertFormDataToMaterial(data);

        console.log(material);
    };

    return (
        <>
            <Typography
                variant="h5"
                sx={{ lineHeight: '50px', paddingBottom: 2 }}
                noWrap
                component="div"
            >
                Enter material details:
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                    {...register('name')}
                    color="secondary"
                    label="Name"
                />
                <TextField
                    {...register('brand')}
                    color="secondary"
                    label="Brand"
                />
                <TextField
                    {...register('diameter')}
                    color="secondary"
                    label="Diameter (mm)"
                />
                <TextField
                    {...register('purchaseUrl')}
                    color="secondary"
                    label="URL"
                />
                <TextField
                    {...register('pricePerPack')}
                    color="secondary"
                    label={`Price per Pack (£)`}
                />

                <TextField
                    {...register('packs')}
                    color="secondary"
                    label="Number of new packs"
                />

                <DropDown
                    label="Material Type"
                    name="type"
                    control={control}
                    options={Object.keys(MaterialType) as Array<MaterialType>}
                />

                <MaterialFormResolver
                    control={control}
                    materialType={currentMaterialType}
                    register={register}
                />
                <Button variant="contained" color="secondary" type="submit">
                    Add Material!
                </Button>
            </form>
        </>
    );
};

export default AddMaterial;

const convertFormDataToMaterial = (formMaterial: IFormMaterial) => {
    switch (formMaterial.type) {
        case MaterialType.WIRE:
            return convertFormWireToMaterial(formMaterial as IFormWire);
        case MaterialType.BEAD:
            return convertFormBeadToMaterial(formMaterial as IFormBead);
    }
};

const convertFormWireToMaterial = (formWire: IFormWire): Wire => {
    const totalLength = formWire.packs * formWire.length;
    const totalPrice = formWire.packs * formWire.pricePerPack;
    const pricePerMeter = totalPrice / totalLength;

    const { packs, pricePerPack, ...rest } = formWire;

    const wire = { ...rest, pricePerMeter } as Wire;

    return wire;
};

const convertFormBeadToMaterial = (formBead: IFormBead): Bead => {
    const totalQuantity = formBead.packs * formBead.quantity;
    const totalPrice = formBead.packs * formBead.pricePerPack;
    const pricePerBead = totalPrice / totalQuantity;

    const { packs, pricePerPack, ...rest } = formBead;

    const bead = { ...rest, pricePerBead } as Bead;

    return bead;
};
