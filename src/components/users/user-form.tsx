"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { userSchema, editUserSchema, type UserFormData, type EditUserFormData } from "@/schemas/user";
import { createUser, updateUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_ROLES } from "@/lib/constants";

interface CreateUserFormProps {
  mode?: "create";
  onSuccess?: () => void;
}

interface EditUserFormProps {
  mode: "edit";
  userId: string;
  initialData: { fullName: string; role: string };
  onSuccess?: () => void;
}

type UserFormProps = CreateUserFormProps | EditUserFormProps;

const roleSelectClass =
  "flex h-9 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-2 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const ChevronIcon = () => (
  <svg
    className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function CreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserFormData>({
    resolver: standardSchemaResolver(userSchema),
    defaultValues: { role: "staff" },
  });

  async function onSubmit(data: UserFormData) {
    setServerError(null);
    const result = await createUser(data);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    reset();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" placeholder="John Doe" {...register("fullName")} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="user@example.com" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Minimum 8 characters" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <div className="relative">
          <select id="role" className={roleSelectClass} {...register("role")}>
            {APP_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>
        {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}

function EditForm({ userId, initialData, onSuccess }: Omit<EditUserFormProps, "mode">) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditUserFormData>({
    resolver: standardSchemaResolver(editUserSchema),
    defaultValues: {
      fullName: initialData.fullName,
      role: initialData.role as EditUserFormData["role"],
    },
  });

  async function onSubmit(data: EditUserFormData) {
    setServerError(null);
    setPasswordError(null);

    if (showPasswordReset) {
      if (!currentPassword) {
        setPasswordError("Current password is required");
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        setPasswordError("New password must be at least 8 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match");
        return;
      }
    }

    const result = await updateUser(userId, {
      ...data,
      password: showPasswordReset ? newPassword : undefined,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" placeholder="John Doe" {...register("fullName")} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <div className="relative">
          <select id="role" className={roleSelectClass} {...register("role")}>
            {APP_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>
        {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
      </div>

      {!showPasswordReset ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowPasswordReset(true)}
        >
          Reset Password
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Reset Password</p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowPasswordReset(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setPasswordError(null);
              }}
            >
              Cancel
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Re-type Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        </div>
      )}

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

export function UserForm(props: UserFormProps) {
  if (props.mode === "edit") {
    return <EditForm userId={props.userId} initialData={props.initialData} onSuccess={props.onSuccess} />;
  }
  return <CreateForm onSuccess={props.onSuccess} />;
}
