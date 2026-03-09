import { listUsers } from "@/actions/users";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const { users, error } = await listUsers();

  return <UsersClient initialUsers={users || []} error={error} />;
}
