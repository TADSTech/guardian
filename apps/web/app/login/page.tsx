"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return;
    setIsLoading(true);

    try {
      // Small simulated delay for smoother transition UX
      await new Promise((resolve) => setTimeout(resolve, 800));

      const usersStr = localStorage.getItem("guardian_users");
      const users = usersStr ? JSON.parse(usersStr) : {};

      if (users[email]) {
        const userData = users[email];
        const storedPassword = typeof userData === "object" ? userData.password : userData;
        const storedName = typeof userData === "object" ? userData.name : "";

        if (storedPassword === password) {
          localStorage.setItem("guardian_user", JSON.stringify({ email, name: storedName }));
          router.push("/dashboard");
          return;
        }
      }
      setError("Invalid email or password.");
      setIsLoading(false);
    } catch (err) {
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !name) return;
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const usersStr = localStorage.getItem("guardian_users");
      const users = usersStr ? JSON.parse(usersStr) : {};

      if (users[email]) {
        setError("An account with this email already exists.");
        setIsLoading(false);
        return;
      }

      users[email] = { password, name };
      localStorage.setItem("guardian_users", JSON.stringify(users));
      localStorage.setItem("guardian_user", JSON.stringify({ email, name }));
      router.push("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--cream)", color: "var(--ink)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a className="brand" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em", fontSize: "1.7rem" }} href="/" aria-label="Guardian home">GUARDIAN</a>
          <p className="mt-2" style={{ color: "var(--muted)" }}>Your digital safety companion</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin" disabled={isLoading}>Sign In</TabsTrigger>
            <TabsTrigger value="create" disabled={isLoading}>Create Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2">
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full flex items-center justify-center gap-2" style={{ background: "var(--deep)" }} disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Signing In...</>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Join Guardian to stay safe online.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="new-name" className="text-sm font-medium">Full Name</label>
                    <Input id="new-name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-email" className="text-sm font-medium">Email</label>
                    <Input id="new-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm font-medium">Password</label>
                    <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2">
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full flex items-center justify-center gap-2" style={{ background: "var(--deep)" }} disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
