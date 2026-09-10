"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui-blocks/status-badge";
import { formatDate, initials } from "@/lib/format";
import { updateUser } from "@/services/users.service";
import type { User } from "@/types";

export function ProfileCard({ user }: { user: User }) {
  const [pending, setPending] = useState(false);

  async function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 2_000_000) {
      toast.error("Use an image smaller than 2 MB.");
      return;
    }
    setPending(true);
    try {
      const imageUrl = await readFileAsDataUrl(file);
      await updateUser(user.id, { imageUrl });
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update photo.");
    } finally {
      setPending(false);
      event.target.value = "";
    }
  }

  const isInlineImage = user.imageUrl.startsWith("data:") || user.imageUrl.startsWith("blob:");

  return (
    <Card className="max-w-xl shadow-none">
      <CardContent className="grid gap-5">
        <div className="flex items-center gap-4">
          <label className="relative size-24 cursor-pointer overflow-hidden rounded-full bg-muted ring-1 ring-border">
            {user.imageUrl ? (
              isInlineImage ? (
                // next/image does not serve data URLs from local uploads.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.imageUrl}
                  alt={`Portrait of ${user.fullName}`}
                  className="size-full object-cover"
                />
              ) : (
                <Image
                  src={user.imageUrl}
                  alt={`Portrait of ${user.fullName}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )
            ) : (
              <span className="flex size-full items-center justify-center text-lg font-medium text-muted-foreground">
                {initials(user.fullName)}
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onPhotoChange}
              disabled={pending}
            />
          </label>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Profile</p>
            <p className="mt-1 text-lg font-medium">{user.fullName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pending ? "Saving photo…" : "Click the portrait to upload a new photo."}
            </p>
          </div>
        </div>
        <ProfileRow label="Full name" value={user.fullName} />
        <ProfileRow label="UUIDv4" value={user.id} mono />
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Account status</p>
          <div className="mt-2">
            <StatusBadge status={user.status} />
          </div>
        </div>
        <ProfileRow label="Member since" value={formatDate(user.memberSince)} />
        <p className="text-sm text-muted-foreground">
          Investment figures cannot be edited from this page. Administrators manage capital
          through the investment workspace; the backend will later control which profile fields
          may be updated.
        </p>
      </CardContent>
    </Card>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read that image."));
    };
    reader.onerror = () => reject(new Error("Unable to read that image."));
    reader.readAsDataURL(file);
  });
}

function ProfileRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={mono ? "mt-1 font-mono text-xs break-all" : "mt-1 text-base font-medium"}>
        {value}
      </p>
    </div>
  );
}
