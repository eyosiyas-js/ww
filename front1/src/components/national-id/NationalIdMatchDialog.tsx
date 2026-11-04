import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNationalIdProfileByIdNumber } from "@/hooks/use-national-id";
import { toast } from "@/hooks/use-toast";

type Props = {
    nationalIdNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const NationalIdMatchDialog: React.FC<Props> = ({
    nationalIdNumber,
    open,
    onOpenChange,
}) => {
    const {
        data: profile,
        isLoading,
        error,
    } = useNationalIdProfileByIdNumber(nationalIdNumber, {
        enabled: open,
    });

    if (error) {
        toast({
            variant: "destructive",
            title: "Failed to load profile",
            description: (error as any).message ?? "Unknown error",
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>National ID Profile</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Details for ID <span className="font-medium">{nationalIdNumber}</span>
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <p className="text-center py-4">Loading…</p>
                ) : profile ? (
                    <div className="grid gap-3 py-4">
                        <p><strong>Name:</strong> {profile.full_name}</p>
                        <p><strong>Gender:</strong> {profile.gender}</p>
                        <p><strong>Date of Birth:</strong> {profile.date_of_birth}</p>
                        <p><strong>City:</strong> {profile.city}</p>
                        <p><strong>Region:</strong> {profile.region}</p>
                        <p><strong>Status:</strong> {profile.is_verified ? "Verified" : "Unverified"}</p>
                    </div>
                ) : (
                    <p className="text-center py-4 text-muted-foreground">No profile found.</p>
                )}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="glass-button">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
