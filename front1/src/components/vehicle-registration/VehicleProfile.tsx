import React from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Car, 
  User, 
  Calendar, 
  Shield, 
  CheckCircle2,
  XCircle,
  FileText,
  Fuel,
  Settings,
  MapPin,
  Phone,
  Mail,
  Hash,
  Gauge
} from "lucide-react";
import type { VehicleRegistration } from "@/types/vehicle-registration";
import { format } from "date-fns";

interface VehicleProfileProps {
  vehicle: VehicleRegistration;
  compact?: boolean;
}

export function VehicleProfile({ vehicle, compact = false }: VehicleProfileProps) {
  const isExpired = new Date(vehicle.expiry_date) < new Date();
  const insuranceExpired = vehicle.insurance_expiry_date && new Date(vehicle.insurance_expiry_date) < new Date();
  
  if (compact) {
    return (
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Compact Header */}
        <div className="px-5 py-4 bg-muted/40 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Car className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-base leading-tight">
                {vehicle.vehicle_make} {vehicle.vehicle_model}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {vehicle.vehicle_year} · {vehicle.vehicle_color} · {vehicle.vehicle_type}
              </p>
            </div>
          </div>
          <Badge 
            variant={isExpired ? "destructive" : "secondary"} 
            className="text-sm font-mono px-3 py-1"
          >
            {vehicle.plate_number}
          </Badge>
        </div>
        
        {/* Compact Details Grid */}
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground text-xs block">Owner</span>
              <p className="font-medium truncate">{vehicle.owner_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground text-xs block">Registration</span>
              <p className="font-medium capitalize">{vehicle.registration_status}</p>
            </div>
          </div>
          {vehicle.owner_phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground text-xs block">Phone</span>
                <p className="font-medium truncate">{vehicle.owner_phone}</p>
              </div>
            </div>
          )}
          {vehicle.region_code && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-muted-foreground text-xs block">Region</span>
                <p className="font-medium">{vehicle.region_code}</p>
              </div>
            </div>
          )}
        </div>

        {/* Compact Violations Footer */}
        {vehicle.has_violations && (
          <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800 text-sm">
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              {vehicle.violation_count} violation{vehicle.violation_count !== 1 ? 's' : ''} on record
              {vehicle.outstanding_fines && ` · Fines: ${vehicle.outstanding_fines}`}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Full Profile Header */}
      <div className="flex items-start justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Car className="h-5.5 w-5.5 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold leading-tight">
                {vehicle.vehicle_make} {vehicle.vehicle_model}
              </h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-0.5">
                <span>{vehicle.vehicle_year}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{vehicle.vehicle_color}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{vehicle.vehicle_type}</span>
              </div>
            </div>
          </div>
        </div>
        <Badge 
          variant={isExpired ? "destructive" : "default"} 
          className="text-base font-mono px-4 py-2 shrink-0"
        >
          {vehicle.plate_number}
        </Badge>
      </div>

      <Separator />

      {/* Vehicle Information */}
      <div className="pt-4">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Car className="h-4 w-4" />
          Vehicle Information
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <InfoItem label="VIN Number" value={vehicle.vin_number} mono />
          <InfoItem label="Engine Number" value={vehicle.engine_number} mono />
          <InfoItem label="Chassis Number" value={vehicle.chassis_number} mono />
          <InfoItem label="Region Code" value={vehicle.region_code} />
        </div>
      </div>

      <Separator className="my-2" />

      {/* Technical Specifications */}
      <div className="pt-4">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Technical Specifications
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <InfoItem label="Engine Capacity" value={vehicle.engine_capacity} />
          <InfoItem label="Fuel Type" value={vehicle.fuel_type} />
          <InfoItem label="Transmission" value={vehicle.transmission_type} />
          <InfoItem label="Seating Capacity" value={vehicle.seating_capacity?.toString()} />
        </div>
      </div>

      <Separator className="my-2" />

      {/* Owner Information */}
      <div className="pt-4">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Owner Information
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <InfoItem label="Full Name" value={vehicle.owner_name} />
          <InfoItem label="National ID" value={vehicle.owner_national_id} mono />
          <div className="col-span-2">
            <InfoItem label="Address" value={vehicle.owner_address} />
          </div>
          <InfoItem label="Phone" value={vehicle.owner_phone} />
          <InfoItem label="Email" value={vehicle.owner_email} />
        </div>
      </div>

      <Separator className="my-2" />

      {/* Registration Information */}
      <div className="pt-4">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Registration Information
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Registration Date</span>
            <p className="text-sm font-medium">{format(new Date(vehicle.registration_date), "PPP")}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Expiry Date</span>
            <p className={`text-sm font-medium ${isExpired ? "text-destructive" : ""}`}>
              {format(new Date(vehicle.expiry_date), "PPP")}
              {isExpired && " (Expired)"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Status</span>
            <Badge variant={vehicle.registration_status === "active" ? "default" : "destructive"} className="mt-0.5">
              {vehicle.registration_status}
            </Badge>
          </div>
          <InfoItem label="Issuing Authority" value={vehicle.issuing_authority} />
        </div>
      </div>

      <Separator className="my-2" />

      {/* Insurance Information */}
      <div className="pt-4">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Insurance Information
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <InfoItem label="Insurance Company" value={vehicle.insurance_company} />
          <InfoItem label="Policy Number" value={vehicle.insurance_policy_number} mono />
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Expiry Date</span>
            <p className={`text-sm font-medium ${insuranceExpired ? "text-destructive" : ""}`}>
              {vehicle.insurance_expiry_date ? format(new Date(vehicle.insurance_expiry_date), "PPP") : "N/A"}
              {insuranceExpired && " (Expired)"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Status</span>
            <Badge variant={vehicle.insurance_status === "active" ? "default" : "destructive"} className="mt-0.5">
              {vehicle.insurance_status || "N/A"}
            </Badge>
          </div>
        </div>
      </div>

      <Separator className="my-2" />

      {/* Inspection Information */}
      <div className="pt-4">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Inspection Information
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Last Inspection</span>
            <p className="text-sm font-medium">
              {vehicle.last_inspection_date ? format(new Date(vehicle.last_inspection_date), "PPP") : "N/A"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Next Inspection</span>
            <p className="text-sm font-medium">
              {vehicle.next_inspection_date ? format(new Date(vehicle.next_inspection_date), "PPP") : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Violations Summary — only if present */}
      {vehicle.has_violations && (
        <>
          <Separator className="my-2" />
          <div className="pt-4 pb-1">
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {vehicle.violation_count} Traffic Violation{vehicle.violation_count !== 1 ? 's' : ''} on Record
                  </p>
                  {vehicle.outstanding_fines && (
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                      Outstanding fines: {vehicle.outstanding_fines}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notes */}
      {vehicle.notes && (
        <>
          <Separator className="my-2" />
          <div className="pt-4">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Notes</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{vehicle.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}

/** Reusable info row for consistent spacing */
function InfoItem({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block mb-1">{label}</span>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value || "N/A"}</p>
    </div>
  );
}
