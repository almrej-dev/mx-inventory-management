import { listUsers } from "@/actions/users";
import { getAuth } from "@/lib/auth";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const [{ users, error }, { user }] = await Promise.all([listUsers(), getAuth()]);

  return (
    <UsersClient
      initialUsers={users || []}
      error={error}
      currentUserId={user?.id ?? ""}
    />
  );
}
