import { Bead, Material, Wire } from "../material";

export interface MakeRequestProps {
    pathname: string;
    method: MethodType;
    operationString: string;
    headers?: Record<string, string>;
    body?: object | FormData;
};

export enum MethodType {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    DELETE = 'DELETE',
};

export type Spread<T> = { [Key in keyof T]: T[Key] };

export type Time = `${number}:${number}`;

export interface PersistentFile {
    filepath: string;
    mimetype?: string;
}

export const isWireMaterial = (material: Material): material is Wire => {
    return material.type === 'WIRE';
}

export const isBeadMaterial = (material: Material): material is Bead => {
    return material.type === 'BEAD';
}
