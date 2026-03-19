"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { userSchema, editUserSchema, type UserFormData, type EditUserFormData } from "@/schemas/user";
import { createUser, updateUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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


function CreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, clearErrors, formState: { errors, isSubmitting } } = useForm<UserFormData>({
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
    <form noValidate onSubmit={handleSubmit(onSubmit)} onFocus={(e) => { const name = (e.target as HTMLElement).getAttribute('name'); if (name && name in errors) clearErrors(name as keyof UserFormData); }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" placeholder="John Doe" aria-invalid={!!errors.fullName} {...register("fullName")} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="user@example.com" aria-invalid={!!errors.email} {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Minimum 8 characters" aria-invalid={!!errors.password} {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="role" className="w-full capitalize" aria-invalid={!!errors.role} onFocus={() => clearErrors("role")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
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

  const { register, handleSubmit, control, clearErrors, formState: { errors, isSubmitting } } = useForm<EditUserFormData>({
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
    <form noValidate onSubmit={handleSubmit(onSubmit)} onFocus={(e) => { const name = (e.target as HTMLElement).getAttribute('name'); if (name && name in errors) clearErrors(name as keyof EditUserFormData); }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" placeholder="John Doe" aria-invalid={!!errors.fullName} {...register("fullName")} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="role" className="w-full capitalize" aria-invalid={!!errors.role} onFocus={() => clearErrors("role")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
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
