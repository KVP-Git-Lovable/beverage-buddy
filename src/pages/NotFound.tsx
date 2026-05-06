import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Only log in dev mode when online
    if (navigator.onLine) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }

    // Self-heal stale PWA cache issues for customer portal routes
    if (location.pathname.startsWith('/customer-portal')) {
      const recoveryKey = 'customer-portal-route-recovery';
      const alreadyAttempted = sessionStorage.getItem(recoveryKey) === '1';

      if (!alreadyAttempted) {
        sessionStorage.setItem(recoveryKey, '1');

        (async () => {
          try {
            if ('caches' in window) {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map((name) => caches.delete(name)));
            }

            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              await Promise.all(registrations.map((registration) => registration.unregister()));
            }
          } catch (error) {
            console.warn('Customer portal route recovery failed:', error);
          } finally {
            const freshTarget = `/customer-portal/login?fresh=${Date.now()}`;
            window.location.replace(freshTarget);
          }
        })();
      }
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4 standalone-page">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">Oops! Page not found</p>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild className="mt-4">
            <a href="/">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
