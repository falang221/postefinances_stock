import { useQuery } from "@tanstack/react-query";
import { useProductApi } from "@/api/products";
import { ProductFullResponse } from "@/types/api";

const PRODUCTS_QUERY_KEY = ["products"];

export const useProducts = (searchTerm?: string) => {
  const { getProducts } = useProductApi();

  return useQuery<ProductFullResponse[], Error>({
    queryKey: [...PRODUCTS_QUERY_KEY, searchTerm],
    queryFn: () => getProducts(searchTerm),
    enabled: true, // Query will run automatically
  });
};
