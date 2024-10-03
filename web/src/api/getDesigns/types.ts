export interface Design {
  material: string;
  price: number;
  name: string;
}

export interface GetDesignsResponse {
  status: number;
  body: Array<Design>
}
