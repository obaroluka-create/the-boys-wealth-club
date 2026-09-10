"use client";

import { useState } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { updateBalance } from "@/services/investments.service";

export function BalanceUpdateModal({
  open,
  onOpenChange,
  userId,
  previousBalance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  previousBalance: number;
}) {
  const [nextBalance, setNextBalance] = useState(String(previousBalance));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const parsed = Number(nextBalance);
  const valid = Number.isFinite(parsed) && parsed >= 0;

  async function apply() {
    if (!valid) return;
    setPending(true);
    try {
      await updateBalance(userId, parsed);
      toast.success("Balance updated.");
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual balance update</DialogTitle>
            <DialogDescription>
              This change is applied to local mock state until the backend API is connected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Previous balance</p>
              <p className="financial mt-1 text-xl font-semibold">
                {formatCurrency(previousBalance, true)}
              </p>
              <ArrowDown className="mx-auto my-3 size-4 text-muted-foreground" />
              <p className="text-xs tracking-wide text-muted-foreground uppercase">New balance</p>
              <p className="financial mt-1 text-xl font-semibold text-primary">
                {valid ? formatCurrency(parsed, true) : "—"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-balance">Updated balance</Label>
              <Input
                id="new-balance"
                type="number"
                min="0"
                step="0.01"
                value={nextBalance}
                onChange={(event) => setNextBalance(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!valid} onClick={() => setConfirmOpen(true)}>
              Review update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm balance change</AlertDialogTitle>
            <AlertDialogDescription>
              {formatCurrency(previousBalance, true)} will become{" "}
              {valid ? formatCurrency(parsed, true) : "an invalid amount"}. This action is
              recorded in activity history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={apply} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Apply update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
