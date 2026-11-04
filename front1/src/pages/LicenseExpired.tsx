import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LicenseExpired() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="max-w-md w-full bg-card border-2 border-destructive/50 rounded-xl p-8 text-center shadow-2xl space-y-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">License Expired</h1>
        
        <div className="space-y-2 text-muted-foreground">
          <p>Your CIMS trial license has expired.</p>
          <p>Please contact your system administrator or software provider to obtain a new license key.</p>
        </div>
        
        <div className="pt-4 border-t border-border mt-4">
          <p className="text-sm font-medium mb-4">Have a new license file?</p>
          <p className="text-xs text-muted-foreground mb-4">
            Upload the <code className="bg-muted px-1 rounded">cims.lic</code> file to <code className="bg-muted px-1 rounded">/opt/cims/</code> on your backend server and click retry.
          </p>
          <Button 
            className="w-full" 
            onClick={() => window.location.href = "/"}
          >
            Retry Connection
          </Button>
        </div>
      </div>
    </div>
  );
}
