import { FormBead, FormWire } from ".";

export const FormWireKeysEnum: { [K in keyof Required<FormWire>]: K } = {
    wireType: "wireType",
    metalType: "metalType",
    length: "length",
    name: "name",
    brand: "brand",
    diameter: "diameter",
    purchaseUrl: "purchaseUrl",
    type: "type",
    pricePerPack: "pricePerPack",
    packs: "packs"
};

export const FormBeadKeysEnum: { [K in keyof Required<FormBead>]: K } = {
    colour: "colour",
    quantity: "quantity",
    name: "name",
    brand: "brand",
    diameter: "diameter",
    purchaseUrl: "purchaseUrl",
    type: "type",
    pricePerPack: "pricePerPack",
    packs: "packs"
};
