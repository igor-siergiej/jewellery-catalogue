import { Design, GetDesignsResponse } from "./types";
import { QueryClient } from '@tanstack/react-query';

const makeGetDesignsRequest = async () => {
  const endpoint = '/api/designs'
  const url = `${window.origin}${endpoint}`

  const debugUrl = 'https://jewellerycatalogue.onthewifi.com/api/designs'

  const response = await fetch(debugUrl);

  const responseJson = await response.json() as GetDesignsResponse

  return responseJson.body
}

export const getDesignsQuery = () => ({
  queryKey: ['designs'],
  queryFn: async () => makeGetDesignsRequest(),
});

export const designsLoader = (queryClient: QueryClient) => async () => {
  const result = await queryClient.fetchQuery({
    ...getDesignsQuery(),
  });
  return result;
};
