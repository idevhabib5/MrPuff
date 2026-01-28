import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CloudLightning, ShoppingCart, BarChart3, Shield, Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-glow mb-4">
            <CloudLightning className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            VapeShop
            <span className="gradient-primary bg-clip-text text-transparent"> POS</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A modern point of sale system built for vape shops. Manage inventory, 
            track sales, and monitor profits with role-based access control.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 shadow-glow"
              onClick={() => navigate('/auth')}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <div className="p-6 rounded-xl bg-card/50 border border-border/50 shadow-card">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Fast Checkout</h3>
              <p className="text-sm text-muted-foreground">
                Quick product search and barcode scanning for efficient sales processing.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card/50 border border-border/50 shadow-card">
              <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center mb-4 mx-auto">
                <BarChart3 className="w-6 h-6 text-info" />
              </div>
              <h3 className="font-semibold mb-2">Real-time Reports</h3>
              <p className="text-sm text-muted-foreground">
                Track daily, weekly, and monthly profits with detailed analytics.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card/50 border border-border/50 shadow-card">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Role-Based Access</h3>
              <p className="text-sm text-muted-foreground">
                Super Admin, Manager, and Cashier roles with specific permissions.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground relative z-10">
        VapeShop POS • Modern Point of Sale System
      </footer>
    </div>
  );
}
