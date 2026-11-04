import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { AlertCircle, X, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export function CriticalAlertBanner() {
  const { data: notifications = [] } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const unreadAlerts = notifications.filter(
    (n) => n.type === "alert" && !n.read && !dismissedIds.has(n.id)
  );

  // Auto-cycle through alerts
  useEffect(() => {
    if (unreadAlerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % unreadAlerts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [unreadAlerts.length]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    markRead(id);
  };

  if (unreadAlerts.length === 0) return null;

  const safeIndex = currentIndex % unreadAlerts.length;
  const currentAlert = unreadAlerts[safeIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden"
      >
        <div
          className="relative px-4 py-3"
          style={{
            background: "linear-gradient(135deg, hsl(0 72% 51% / 0.9), hsl(25 95% 53% / 0.85), hsl(0 72% 51% / 0.9))",
            backgroundSize: "200% 200%",
            animation: "alertGradient 3s ease infinite",
          }}
        >
          {/* Pulse overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2), transparent 70%)",
              animation: "alertPulse 2s ease-in-out infinite",
            }}
          />

          <div className="relative flex items-center justify-between gap-4 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Pulsing icon */}
              <div className="relative flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
                <div className="absolute inset-0 animate-ping">
                  <AlertCircle className="w-5 h-5 text-white/50" />
                </div>
              </div>

              {/* Alert count badge */}
              {unreadAlerts.length > 1 && (
                <span className="flex-shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm">
                  {unreadAlerts.length}
                </span>
              )}

              {/* Alert content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentAlert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {currentAlert.title}
                    </p>
                    <p className="text-xs text-white/80 truncate">
                      {currentAlert.message}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {currentAlert.actionUrl && (
                <Link
                  to={currentAlert.actionUrl}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-colors"
                >
                  View <ChevronRight className="w-3 h-3" />
                </Link>
              )}
              <button
                onClick={() => handleDismiss(currentAlert.id)}
                className="p-1 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress dots for multiple alerts */}
          {unreadAlerts.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              {unreadAlerts.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <style>{`
          @keyframes alertGradient {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes alertPulse {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.35; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
