import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, AlertCircle, Info, AlertTriangle, CheckCircle, Check, Trash2, ExternalLink, ShieldAlert, Siren } from "lucide-react";
import { Notification } from "@/data/mockData";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const typeIcons = { alert: AlertCircle, info: Info, warning: AlertTriangle, success: CheckCircle };
const typeColors = {
  alert: "text-destructive bg-destructive/10 border-destructive/30",
  info: "text-primary bg-primary/10 border-primary/30",
  warning: "text-warning bg-warning/10 border-warning/30",
  success: "text-success bg-success/10 border-success/30",
};

export default function NotificationsPage() {
  const { data: initialNotifications = [] } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Sync from API on first load
  if (!initialized && initialNotifications.length > 0) {
    setNotifications(initialNotifications);
    setInitialized(true);
  }

  const displayNotifications = initialized ? notifications : initialNotifications;
  const unreadCount = displayNotifications.filter(n => !n.read).length;
  const alertNotifications = displayNotifications.filter(n => n.type === "alert" && !n.read);
  const otherNotifications = displayNotifications.filter(n => !(n.type === "alert" && !n.read));

  const filteredOther = filter === "all"
    ? otherNotifications
    : filter === "unread"
      ? otherNotifications.filter(n => !n.read)
      : otherNotifications.filter(n => n.type === filter);

  const markAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotificationLocal = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const clearAll = () => setNotifications([]);

  return (
    <AppLayout title="Alert Center" subtitle="Critical alerts and system notifications">
      <div className="space-y-6">

        {/* Critical Alerts Section */}
        {alertNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-full">
                <Siren className="w-4 h-4 text-destructive animate-pulse" />
                <span className="text-sm font-bold text-destructive">
                  {alertNotifications.length} Critical Alert{alertNotifications.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex-1 h-px bg-destructive/20" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence>
                {alertNotifications.map((notification, idx) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative overflow-hidden rounded-xl border-2 border-destructive/30"
                    style={{
                      background: "linear-gradient(135deg, hsl(0 72% 51% / 0.08), hsl(25 95% 53% / 0.06), hsl(0 72% 51% / 0.04))",
                    }}
                  >
                    {/* Accent stripe */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-destructive to-destructive/60" />

                    <div className="p-4 pl-6 flex items-start gap-4">
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/15 border border-destructive/30">
                          <ShieldAlert className="w-5 h-5 text-destructive" />
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive animate-pulse" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-foreground text-base">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          {notification.actionUrl && (
                            <Button size="sm" className="gap-1 h-8 bg-destructive hover:bg-destructive/90 text-white" asChild>
                              <Link to={notification.actionUrl}>Respond Now <ExternalLink className="w-3 h-3" /></Link>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="gap-1 h-8 text-xs border-destructive/30 hover:bg-destructive/10" onClick={() => markAsRead(notification.id)}>
                            <Check className="w-3 h-3" /> Acknowledge
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteNotificationLocal(notification.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Other Notifications */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />Notifications
                  {unreadCount > 0 && <Badge variant="destructive">{unreadCount} new</Badge>}
                </CardTitle>
                <CardDescription>System messages, updates, and resolved alerts</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0} className="gap-2"><Check className="w-4 h-4" />Mark all read</Button>
                <Button variant="outline" size="sm" onClick={clearAll} disabled={displayNotifications.length === 0} className="gap-2 text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" />Clear all</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All ({otherNotifications.length})</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="alert" className="text-destructive">Alerts</TabsTrigger>
                <TabsTrigger value="warning">Warnings</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="success">Success</TabsTrigger>
              </TabsList>
              <TabsContent value={filter} className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredOther.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                      <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No notifications</p>
                    </motion.div>
                  ) : (
                    filteredOther.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} onMarkAsRead={markAsRead} onDelete={deleteNotificationLocal} />
                    ))
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: { notification: Notification; onMarkAsRead: (id: string) => void; onDelete: (id: string) => void }) {
  const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Info;
  const colorClass = typeColors[notification.type as keyof typeof typeColors] || typeColors.info;
  
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className={cn("p-4 rounded-lg border transition-all duration-200", notification.read ? "bg-card/50 border-border" : `border-l-4 ${colorClass.split(" ")[2]} bg-card`)}>
      <div className="flex items-start gap-4">
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", colorClass.split(" ").slice(1, 2).join(" "))}>
          <Icon className={cn("w-5 h-5", colorClass.split(" ")[0])} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className={cn("font-medium", !notification.read && "text-foreground")}>{notification.title}</h4>
                {!notification.read && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(notification.timestamp)}</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {notification.actionUrl && (
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" asChild>
                <Link to={notification.actionUrl}>View Details<ExternalLink className="w-3 h-3" /></Link>
              </Button>
            )}
            {!notification.read && (
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => onMarkAsRead(notification.id)}><Check className="w-3 h-3" />Mark as read</Button>
            )}
            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => onDelete(notification.id)}><Trash2 className="w-3 h-3" />Delete</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
