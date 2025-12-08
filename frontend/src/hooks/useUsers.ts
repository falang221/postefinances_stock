import { useQuery } from "@tanstack/react-query";
import { useUserApi } from "@/api/users";
import { UserFullResponse } from "@/types/api";

const USERS_QUERY_KEY = ["users"];

export const useUsers = (searchTerm?: string) => {
  const { getUsers } = useUserApi();

  return useQuery<UserFullResponse[], Error>({
    queryKey: [...USERS_QUERY_KEY, searchTerm],
    queryFn: () => getUsers(searchTerm),
    enabled: true, // Query will run automatically
  });
};
