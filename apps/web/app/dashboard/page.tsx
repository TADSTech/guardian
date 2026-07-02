"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageSquare, AppWindow, ShieldAlert, ShieldCheck, ShieldQuestion, Globe, Settings, History, ArrowRight, Loader2, Users, Download, FileText, AlertTriangle, CheckCircle2, Upload, ImageIcon } from "lucide-react";
import { GoogleTranslate } from "@/components/google-translate";
import { API_BASE_URL } from "@/lib/api";
import type { AnalysisResult } from "@guardian/contracts";
import { Tooltip } from "@mui/material";
import gsap from "gsap";

// Fallback content shown before the real scan history loads (or if the API
// is unreachable). Real data comes from GET /v1/analyze/history.
const recentScans = [
  { id: 1, type: "WhatsApp Message", excerpt: "Your account will be suspended. Click here to verify...", risk: "Critical", date: "2 hours ago" },
  { id: 2, type: "Medical Document", excerpt: "Prescription: Amoxicillin 500mg, take 3 times daily...", risk: "Safe", date: "Yesterday" },
  { id: 3, type: "Voice Note", excerpt: "Hello, this is customer service. We need your BVN...", risk: "High Risk", date: "2 days ago" },
];

function escapeCsvField(field: string): string {
  const escaped = field.replace(/"/g, '""');
  return /[",\n]/.test(field) ? `"${escaped}"` : escaped;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [scanInput, setScanInput] = useState("");
  const [scanImage, setScanImage] = useState<File | null>(null);
  const [scanImagePreview, setScanImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AnalysisResult | null>(null);

  const [exportState, setExportState] = useState<"idle" | "loading" | "error" | "success">("idle");

  // Scans history state
  const [scansHistory, setScansHistory] = useState<any[]>(recentScans);

  // WhatsApp Bot connection states
  const [waStatus, setWaStatus] = useState<string>("DISCONNECTED");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waPairingCode, setWaPairingCode] = useState<string | null>(null);
  const [waPhoneNumber, setWaPhoneNumber] = useState<string>("");
  const [waConnecting, setWaConnecting] = useState<boolean>(false);

  const fetchScansHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/analyze/history`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setScansHistory(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch scan history", err);
    }
  };

  useEffect(() => {
    fetchScansHistory();
  }, []);

  useEffect(() => {
    const session = localStorage.getItem("guardian_user");
    if (!session) {
      router.push("/login");
    } else {
      try {
        const { email } = JSON.parse(session);
        setUserEmail(email);
      } catch {
        router.push("/login");
      }
    }
  }, [router]);

  // Poll WhatsApp status
  useEffect(() => {
    let intervalId: any;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/whatsapp/status`);
        if (res.ok) {
          const data = await res.json();
          setWaStatus(data.status);
          setWaQr(data.qr);
          setWaPairingCode(data.pairingCode);
        }
      } catch (err) {
        console.error("Failed to fetch WhatsApp status", err);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 3000);

    return () => clearInterval(intervalId);
  }, []);

  // GSAP Entrance Animations
  useEffect(() => {
    if (userEmail) {
      gsap.from(".dashboard-title", { opacity: 0, x: -20, duration: 0.6, ease: "power2.out" });
      gsap.from(".dashboard-tabs-list", { opacity: 0, y: -10, duration: 0.6, delay: 0.1, ease: "power2.out" });
      gsap.from(".dashboard-card", { opacity: 0, y: 15, stagger: 0.1, duration: 0.8, delay: 0.15, ease: "power3.out" });
    }
  }, [userEmail]);

  const handleConnectWhatsApp = async () => {
    setWaConnecting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/whatsapp/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: waPhoneNumber }),
      });
      if (res.ok) {
        // Fetch status immediately to show state change
        const statusRes = await fetch(`${API_BASE_URL}/v1/whatsapp/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setWaStatus(statusData.status);
          setWaQr(statusData.qr);
          setWaPairingCode(statusData.pairingCode);
        }
      }
    } catch (err) {
      console.error("Failed to connect WhatsApp", err);
    } finally {
      setWaConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/whatsapp/disconnect`, {
        method: "POST",
      });
      if (res.ok) {
        setWaStatus("DISCONNECTED");
        setWaQr(null);
        setWaPairingCode(null);
      }
    } catch (err) {
      console.error("Failed to disconnect WhatsApp", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("guardian_user");
    router.push("/");
  };

  const handleScan = async (source: "text" | "image" = "text") => {
    if (source === "text" && !scanInput.trim()) return;
    if (source === "image" && !scanImage) return;
    setIsScanning(true);
    setScanResult(null);
    
    try {
      let fixtureKey: string | undefined = undefined;
      const normalizedInput = scanInput.toLowerCase();
      if (normalizedInput.includes("bvn") || normalizedInput.includes("otp") || normalizedInput.includes("prize")) {
        fixtureKey = "bank-otp";
      } else if (normalizedInput.includes("amoxicillin") || normalizedInput.includes("prescription")) {
        fixtureKey = "amoxicillin-prescription";
      }

      const endpoint = source === "image" ? "document" : "scam";
      const res = await fetch(`${API_BASE_URL}/v1/analyze/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: endpoint,
          fixtureKey,
          input: {
            text: scanInput,
            fileName: scanImage ? scanImage.name : undefined
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        fetchScansHistory();
      } else {
        throw new Error("API returned non-200 response");
      }
    } catch (err) {
      console.error("Scan failed", err);
      setScanResult({
        kind: source === "image" ? "document" : "scam",
        riskLevel: "medium",
        explanation: "API could not be reached. Automated Local Fallback: Treat this text with caution and do not share details until verified.",
        evidence: ["API connection offline"],
        actions: ["Do not share credentials/OTPs.", "Verify sender details directly."],
        disclaimer: "Guardian local offline fallback summary."
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportCsv = async () => {
    setExportState("loading");
    try {
      const res = await fetch(`${API_BASE_URL}/v1/analyze/history`);
      if (!res.ok) throw new Error("Failed to fetch scan history");
      const records: { type: string; risk: string; excerpt: string; date: string }[] = await res.json();

      const rows = [["Type", "Risk Level", "Details", "Date"], ...records.map(r => [r.type, r.risk, r.excerpt, r.date])];
      const csv = rows.map(row => row.map(escapeCsvField).join(",")).join("\n");

      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `guardian-incident-report-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setExportState("success");
    } catch (err) {
      console.error("CSV export failed", err);
      setExportState("error");
    }
  };

  // Real connection status for the WhatsApp-connected member. The Browser
  // Extension member has no telemetry channel back to the API yet, so it's
  // shown as an example rather than asserted as live-protected.
  const highRiskScanCount = scansHistory.filter((scan) => scan.risk === "Critical" || scan.risk === "High Risk").length;
  const familyMembers = [
    {
      id: 1,
      name: "Mama (Mother)",
      role: "Elderly",
      status: waStatus === "CONNECTED" ? "Protected" : "Not Connected",
      alerts: highRiskScanCount,
      lastActive: waStatus === "CONNECTED" ? "Active now" : "WhatsApp Bot not linked",
      device: "WhatsApp Bot",
    },
    {
      id: 2,
      name: "Tunde (Son)",
      role: "Child",
      status: "Example",
      alerts: 0,
      lastActive: "Install the Chrome extension to activate live protection",
      device: "Browser Extension",
    },
  ];

  // Real incidents come from GET /v1/analyze/history via scansHistory.
  const familyAlerts = scansHistory.map((scan) => ({
    id: scan.id,
    type: scan.type,
    details: scan.excerpt,
    date: scan.date,
    severity: scan.risk === "Critical" ? "Critical" : scan.risk === "High Risk" ? "High" : "Info",
  }));

  if (!userEmail) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cream)", color: "var(--ink)" }}>
      {/* Navbar */}
      <header className="site-header border-b bg-white sticky top-0 z-10" style={{ borderColor: "var(--line)", padding: "1rem 2rem" }}>
        <a className="brand" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em", fontSize: "1.5rem" }} href="/dashboard" aria-label="Guardian dashboard">GUARDIAN</a>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-sm font-medium">
            <Globe className="w-4 h-4" />
            <GoogleTranslate />
          </div>
          <span className="text-sm hidden sm:inline-block font-medium" style={{ color: "var(--muted)" }}>{userEmail}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>Sign out</Button>
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        <Tabs defaultValue="family" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl mb-1 dashboard-title" style={{ fontFamily: "var(--serif)", letterSpacing: "-0.04em", lineHeight: 1.1 }}>Dashboard</h1>
              <p style={{ color: "var(--muted)" }}>Manage your safety and monitor your connected family members.</p>
            </div>
            <TabsList className="bg-white border shadow-sm p-1 rounded-xl h-auto dashboard-tabs-list" style={{ borderColor: "var(--line)" }}>
              <TabsTrigger value="family" className="rounded-lg py-2 px-4 data-[state=active]:bg-green-50 data-[state=active]:text-green-800"><Users className="w-4 h-4 mr-2" /> Family Safety</TabsTrigger>
              <TabsTrigger value="scanner" className="rounded-lg py-2 px-4 data-[state=active]:bg-green-50 data-[state=active]:text-green-800"><ShieldCheck className="w-4 h-4 mr-2" /> Manual Scanner</TabsTrigger>
              <TabsTrigger value="data" className="rounded-lg py-2 px-4 data-[state=active]:bg-green-50 data-[state=active]:text-green-800"><FileText className="w-4 h-4 mr-2" /> Export & Reports</TabsTrigger>
            </TabsList>
          </div>

          {/* FAMILY SAFETY TAB */}
          <TabsContent value="family" className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-2 space-y-6">
                <Card className="border-none shadow-sm bg-white dashboard-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl">Connected Members</CardTitle>
                    <CardDescription>Monitor the digital safety status of your dependents.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {familyMembers.map(member => (
                      <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border hover:border-green-300 transition-colors" style={{ borderColor: "var(--line)" }}>
                        <div className="flex items-center gap-4 mb-3 sm:mb-0">
                          <div className={`p-3 rounded-full ${member.status === 'Protected' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                            {member.status === 'Protected' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{member.name}</h3>
                            <div className="flex gap-2 text-xs text-gray-500 font-medium">
                              <span className="uppercase">{member.role}</span> &bull; 
                              <span>{member.device}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="text-right flex-1 sm:flex-none">
                            <p className="text-sm font-bold text-gray-800">{member.alerts} Threats Blocked</p>
                            <p className="text-xs text-gray-400">Last active: {member.lastActive}</p>
                          </div>
                          <Tooltip title="Configure security alerts and settings">
                            <Button variant="outline" size="sm">Manage</Button>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Tooltip title="Generate an invite code to connect a family member">
                            <Button variant="outline" className="w-full mt-2 border-dashed border-2 hover:bg-gray-50 text-gray-600 font-bold">
                              + Invite Family Member
                            </Button>
                          </Tooltip>
                        }
                      />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Link Copied!</DialogTitle>
                          <DialogDescription>
                            The invitation link has been copied to your clipboard. Send it to your family member via WhatsApp to connect them to Guardian.
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white dashboard-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl flex items-center gap-2"><History className="w-5 h-5" /> Threat Interception Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {familyAlerts.map(alert => (
                        <div key={alert.id} className="p-4 bg-gray-50 rounded-xl border-l-4" style={{ borderLeftColor: alert.severity === 'Critical' ? '#dc2626' : alert.severity === 'High' ? '#ea580c' : '#3b82f6' }}>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm">{alert.type}</h4>
                            <span className="text-xs text-gray-400">{alert.date}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.details}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-none shadow-sm bg-white bg-gradient-to-br from-green-50 to-white dashboard-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-green-600" /> WhatsApp Integration
                    </CardTitle>
                    <CardDescription>Guardian works where your family already communicates.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Connect the Guardian WhatsApp bot to an elderly parent's phone. They can forward any suspicious message to the bot to get an instant safety check.
                    </p>

                    {waStatus === "CONNECTED" && (
                      <div className="p-4 bg-green-100 border border-green-200 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
                          <span className="w-3.5 h-3.5 rounded-full bg-green-600 animate-pulse" />
                          Bot Status: Connected & Active
                        </div>
                        <p className="text-xs text-green-700">
                          The WhatsApp bot is now ready. Try forwarding a message to it on WhatsApp!
                        </p>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={handleDisconnectWhatsApp}
                          className="w-full font-bold"
                        >
                          Disconnect Bot
                        </Button>
                      </div>
                    )}

                    {waStatus === "CONNECTING" && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-yellow-800 font-bold">
                          <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                          Status: Connecting...
                        </div>
                        
                        {waPairingCode ? (
                          <div className="space-y-2">
                            <p className="text-xs text-yellow-700 font-medium">
                              Enter this code on your WhatsApp Web Link Device screen:
                            </p>
                            <div className="p-3 bg-white border border-yellow-200 rounded-lg text-center font-mono text-xl font-extrabold tracking-widest text-yellow-900 select-all">
                              {waPairingCode}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-yellow-700">
                            Waiting for WhatsApp to generate pairing credentials...
                          </p>
                        )}

                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDisconnectWhatsApp}
                          className="w-full font-bold"
                        >
                          Cancel Connection
                        </Button>
                      </div>
                    )}

                    {waStatus === "DISCONNECTED" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Parent's Phone Number</label>
                          <Input 
                            type="text" 
                            placeholder="e.g. +2348012345678" 
                            value={waPhoneNumber}
                            onChange={(e) => setWaPhoneNumber(e.target.value)}
                            className="bg-white rounded-lg border-gray-300"
                          />
                        </div>
                        
                        <Tooltip title="Link a phone number to get pairing credentials">
                          <span>
                            <Button 
                              onClick={handleConnectWhatsApp}
                              disabled={!waPhoneNumber.trim() || waConnecting}
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                            >
                              {waConnecting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Code...</>
                              ) : "Request Pairing Code"}
                            </Button>
                          </span>
                        </Tooltip>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white bg-gradient-to-br from-blue-50 to-white dashboard-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" /> Browser Extension</CardTitle>
                    <CardDescription>Block phishing links automatically.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">Install the Guardian extension on your child's laptop to automatically intercept known scams and highlight dangerous keywords.</p>
                    
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Tooltip title="Download extension files for manual install">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">Install Extension</Button>
                          </Tooltip>
                        }
                      />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2"><AppWindow className="w-5 h-5 text-blue-600" /> Setup Chrome Extension</DialogTitle>
                          <DialogDescription>
                            Because this is a limited hackathon demo build, the extension must be sideloaded manually via Chrome Developer mode.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <a href="/guardian-extension-demo.zip" download>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 font-bold mb-4">
                              <Download className="w-4 h-4 mr-2" /> Download Demo Build (.zip)
                            </Button>
                          </a>
                          
                          <div className="text-sm space-y-2">
                            <h4 className="font-bold">Installation Steps:</h4>
                            <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                              <li>Extract the downloaded <code>guardian-extension-demo.zip</code> file.</li>
                              <li>Open Chrome and navigate to <code>chrome://extensions</code></li>
                              <li>Toggle <strong>"Developer mode"</strong> on the top right.</li>
                              <li>Click <strong>"Load unpacked"</strong> and select the extracted folder.</li>
                            </ol>
                            <p className="text-xs text-gray-500 italic mt-4">*Note: The demo extension will highlight phishing trigger words (like "OTP", "BVN") in red across all webpages to demonstrate the detection capability.</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* MANUAL SCANNER TAB */}
          <TabsContent value="scanner" className="animate-in fade-in duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-2xl border shadow-sm dashboard-card" style={{ borderColor: "var(--line)" }}>
                <div className="mb-6">
                  <h2 className="text-2xl font-serif mb-2">Guardian Analysis Tool</h2>
                  <p style={{ color: "var(--muted)" }}>Paste a suspicious message, upload a document image, or drop a file to get an instant safety check.</p>
                </div>

                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-50 p-1 rounded-xl">
                    <TabsTrigger value="text" className="rounded-lg">Paste Text</TabsTrigger>
                    <TabsTrigger value="image" className="rounded-lg">Upload Image</TabsTrigger>
                    <Tooltip title="Voice analysis is processed automatically via WhatsApp Bot notes">
                      <span className="flex-1">
                        <TabsTrigger value="voice" disabled className="rounded-lg opacity-50 w-full">Voice Note</TabsTrigger>
                      </span>
                    </Tooltip>
                  </TabsList>
                  
                  <TabsContent value="text" className="space-y-4">
                    <Textarea 
                      placeholder="e.g., Congratulations! You have been selected to receive 50,000 Naira. Click the link to claim your prize..." 
                      className="min-h-[160px] resize-none text-base p-4 rounded-xl"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                    />
                    <Button 
                      onClick={() => handleScan("text")} 
                      disabled={!scanInput.trim() || isScanning}
                      className="w-full h-12 text-lg font-bold rounded-xl transition-all" 
                      style={{ background: "var(--deep)" }}
                    >
                      {isScanning ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</>
                      ) : "Analyze for Safety"}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="image" className="space-y-4">
                    <div
                      className="relative flex flex-col items-center justify-center min-h-[160px] border-2 border-dashed rounded-xl cursor-pointer hover:border-green-400 transition-colors p-6"
                      style={{ borderColor: scanImage ? "#16a34a" : "var(--line)" }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith("image/")) {
                          setScanImage(file);
                          setScanImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      onClick={() => document.getElementById("image-upload-input")?.click()}
                    >
                      <input
                        id="image-upload-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setScanImage(file);
                            setScanImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {scanImagePreview ? (
                        <div className="flex flex-col items-center gap-3 w-full">
                          <img
                            src={scanImagePreview}
                            alt="Uploaded preview"
                            className="max-h-[200px] rounded-lg object-contain"
                          />
                          <p className="text-sm text-gray-500 font-medium">{scanImage?.name}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setScanImage(null);
                              setScanImagePreview(null);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <ImageIcon className="w-12 h-12" />
                          <p className="text-lg font-medium">Click to upload or drag and drop</p>
                          <p className="text-sm">PNG, JPG, WebP up to 10MB</p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleScan("image")}
                      disabled={!scanImage || isScanning}
                      className="w-full h-12 text-lg font-bold rounded-xl transition-all"
                      style={{ background: "var(--deep)" }}
                    >
                      {isScanning ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Upload className="mr-2 h-5 w-5" /> Analyze Image for Safety</>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {scanResult && (
                <div 
                  className="bg-white p-6 md:p-8 rounded-2xl border shadow-lg border-t-4 animate-in fade-in slide-in-from-bottom-4 duration-500" 
                  style={{ 
                    borderTopColor: 
                      scanResult.riskLevel === "low" ? "#16a34a" : 
                      scanResult.riskLevel === "medium" ? "#f59e0b" : 
                      "#dc2626" 
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${
                      scanResult.riskLevel === "low" ? "bg-green-100 text-green-800" : 
                      scanResult.riskLevel === "medium" ? "bg-yellow-100 text-yellow-800" : 
                      "bg-red-100 text-red-800"
                    }`}>
                      {scanResult.riskLevel === "low" ? (
                        <ShieldCheck className="w-6 h-6" />
                      ) : scanResult.riskLevel === "medium" ? (
                        <ShieldQuestion className="w-6 h-6" />
                      ) : (
                        <ShieldAlert className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-serif font-bold">Guardian Summary</h3>
                        <Badge 
                          variant="outline" 
                          className={`border-none font-bold ${
                            scanResult.riskLevel === "low" ? "bg-green-100 text-green-800" : 
                            scanResult.riskLevel === "medium" ? "bg-yellow-100 text-yellow-800" : 
                            "bg-red-100 text-red-800"
                          }`}
                        >
                          {(scanResult.riskLevel || "unknown").toUpperCase()} RISK
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700 text-lg leading-relaxed mt-3">{scanResult.explanation}</p>
                      
                      {scanResult.evidence && scanResult.evidence.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-bold text-sm text-gray-800 uppercase tracking-wider mb-2">Evidence Detected:</h4>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                            {scanResult.evidence.map((ev, i) => (
                              <li key={i}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {scanResult.actions && scanResult.actions.length > 0 && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                          <h4 className="font-bold text-sm text-gray-800 uppercase tracking-wider mb-2">Safe Next Steps:</h4>
                          <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                            {scanResult.actions.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {scanResult.disclaimer && (
                        <p className="text-xs text-gray-400 italic mt-6">{scanResult.disclaimer}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="font-serif text-xl flex items-center gap-2"><History className="w-5 h-5" /> Your Personal Scans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {scansHistory.map((scan) => (
                      <div key={scan.id} className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 transition-colors cursor-pointer rounded-lg px-2 -mx-2">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{scan.type}</span>
                        </div>
                        <p className="text-sm font-medium mb-2 truncate">{scan.excerpt}</p>
                        <Badge variant="secondary" className={
                          scan.risk === "Safe" ? "bg-green-100 text-green-700 hover:bg-green-100" : 
                          scan.risk === "High Risk" ? "bg-red-100 text-red-700 hover:bg-red-100" : 
                          "bg-red-200 text-red-900 hover:bg-red-200"
                        }>{scan.risk}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* EXPORT DATA TAB */}
          <TabsContent value="data" className="animate-in fade-in duration-500">
            <Card className="border-none shadow-sm bg-white max-w-3xl">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Data Export & Reports</CardTitle>
                <CardDescription>Download safety reports for your family members to share with authorities or keep for personal records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white rounded-xl shadow-sm"><FileText className="w-8 h-8 text-green-700" /></div>
                    <div>
                      <h3 className="font-bold text-lg">Monthly Safety Report</h3>
                      <p className="text-sm text-gray-500">PDF summaries aren't built yet — use the CSV incident report below in the meantime.</p>
                    </div>
                  </div>
                  <Tooltip title="PDF report generation is not implemented yet">
                    <span>
                      <Button disabled className="w-full sm:w-auto bg-green-700 hover:bg-green-800"><Download className="w-4 h-4 mr-2" /> Download PDF (coming soon)</Button>
                    </span>
                  </Tooltip>
                </div>

                <div className="p-6 border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white rounded-xl shadow-sm"><AlertTriangle className="w-8 h-8 text-red-700" /></div>
                    <div>
                      <h3 className="font-bold text-lg">Incident Report (Fraud)</h3>
                      <p className="text-sm text-gray-500">Detailed logs of high-risk scams suitable for reporting to banks.</p>
                    </div>
                  </div>
                  <Dialog onOpenChange={(open) => { if (!open) setExportState("idle"); }}>
                    <DialogTrigger
                      render={
                        <Button variant="outline" className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50"><Download className="w-4 h-4 mr-2" /> Download CSV</Button>
                      }
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Incident Report (CSV)</DialogTitle>
                      </DialogHeader>
                      <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                        {exportState === "idle" && (
                          <>
                            <p className="text-gray-500 mb-4">Download detailed logs of high-risk scams suitable for bank reports.</p>
                            <Button onClick={handleExportCsv} className="w-full bg-red-600 hover:bg-red-700 text-white">
                              Start Export
                            </Button>
                          </>
                        )}
                        {exportState === "loading" && (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                            <p className="text-gray-600">Compiling incident logs into CSV format...</p>
                          </>
                        )}
                        {exportState === "success" && (
                          <>
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                            <p className="text-green-700 font-medium">CSV downloaded.</p>
                            <p className="text-sm text-gray-500">Check your browser's downloads folder.</p>
                            <Button onClick={handleExportCsv} variant="outline" className="w-full mt-4">
                              Download again
                            </Button>
                          </>
                        )}
                        {exportState === "error" && (
                          <>
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                            <p className="text-red-600 font-medium">Export failed — could not reach the Guardian API.</p>
                            <p className="text-sm text-gray-500">Please try again later.</p>
                            <Button onClick={handleExportCsv} variant="outline" className="w-full mt-4">
                              Retry
                            </Button>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
