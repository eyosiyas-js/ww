import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Mail, Loader2 } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const userResponse = await login({ email, password });
            
            toast({
                title: "Login Successful",
                description: "Welcome back to Public Safety System Dashboard.",
            });

            // If the user is an admin, always redirect to /admin
            // We need to check the user record from the login response or auth context
            const user = (userResponse as any)?.user;
            const isAdmin = user?.role === "Super Admin" || user?.role === "Company Admin";
            
            if (isAdmin) {
                navigate("/admin", { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: error.message || "Invalid email or password. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-t-4 border-t-primary shadow-lg animate-in fade-in zoom-in duration-300">
                <CardHeader className="space-y-1 flex flex-col items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Public Safety System Login</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the surveillance dashboard
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@organization.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Button variant="link" size="sm" className="px-0 font-normal" type="button">
                                    Forgot password?
                                </Button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full h-11" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <div className="fixed bottom-4 left-0 right-0 text-center text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Public Safety System
            </div>
        </div>
    );
};

export default LoginPage;
