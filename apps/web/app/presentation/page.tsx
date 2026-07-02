"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, ArrowLeft, Volume2, Download, AlertTriangle, Activity, Mic, Lightbulb } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { demoFixtures } from "@guardian/demo-fixtures";
import type { AnalysisResult } from "@guardian/contracts";
import { Tooltip, Zoom } from "@mui/material";
import gsap from "gsap";

const scenarios = [
  {
    id: "scam",
    title: "Scenario 1: Urgent Scam Message",
    description: "Vulnerable user receives a text warning that their account will be suspended today, demanding an OTP.",
    fixtureKey: "bank-otp",
    inputData: { text: "Your bank account will be closed today. Send your OTP now to verify." }
  },
  {
    id: "document",
    title: "Scenario 2: Healthcare Prescription",
    description: "An elderly parent receives a handwritten prescription and needs a plain-language translation of dosage instructions.",
    fixtureKey: "amoxicillin-prescription",
    inputData: { text: "Prescription: Amoxicillin 500mg, take 3 times daily after meals." }
  },
  {
    id: "voice",
    title: "Scenario 3: Voice Note Verification",
    description: "A grandparent receives a voice message requesting confirmation codes for WhatsApp registration.",
    fixtureKey: "voice-otp",
    inputData: { text: "OTP voice note asking for verification code." }
  }
];

const scenarioIcons: Record<string, React.ReactNode> = {
  scam: <AlertTriangle className="w-8 h-8 text-red-600" />,
  document: <Activity className="w-8 h-8 text-green-700" />,
  voice: <Mic className="w-8 h-8 text-blue-600" />
};

export default function PresentationPage() {
  const [activeScenario, setActiveScenario] = useState<typeof scenarios[0] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [playingVoice, setPlayingVoice] = useState(false);

  // GSAP Entrance Animations
  useEffect(() => {
    gsap.from(".presentation-title", { opacity: 0, y: -20, duration: 0.6, ease: "power2.out" });
    gsap.from(".presentation-card", { opacity: 0, y: 15, stagger: 0.1, duration: 0.8, delay: 0.15, ease: "power3.out" });
  }, []);

  const runScenario = async (scenario: typeof scenarios[0]) => {
    setActiveScenario(scenario);
    setIsAnalyzing(true);
    setResult(null);

    try {
      const endpoint = scenario.id === "document" ? "document" : scenario.id === "voice" ? "voice" : "scam";
      const res = await fetch(`${API_BASE_URL}/v1/analyze/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: endpoint,
          fixtureKey: scenario.fixtureKey,
          input: scenario.inputData
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        throw new Error();
      }
    } catch (err) {
      // Offline fallback: use the same fixture data the real API would have
      // returned, so a dead API doesn't show a different story than a live one.
      const fixture = demoFixtures.find((f) => f.id === scenario.fixtureKey);
      if (fixture) setResult(fixture.result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReadAloud = () => {
    if (!result) return;
    if (playingVoice) {
      window.speechSynthesis.cancel();
      setPlayingVoice(false);
    } else {
      const textToSpeak = `${result.explanation}. Evidence: ${result.evidence.join(". ")}. Actions: ${result.actions.join(". ")}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => setPlayingVoice(false);
      window.speechSynthesis.speak(utterance);
      setPlayingVoice(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfaf3] text-[#102a22]">
      {/* Navbar */}
      <header className="site-header border-b bg-white" style={{ borderColor: "var(--line)" }}>
        <a className="brand" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em", fontSize: "1.5rem" }} href="/dashboard">
          GUARDIAN
        </a>
        <Badge variant="outline" className="bg-green-50 text-green-800 font-bold border-green-200">
          JUDGE MODE ACTIVE
        </Badge>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-3xl font-serif mb-2 presentation-title">Presentation Scenario Hub</h1>
          <p className="text-gray-500">Run one-click scenarios to demonstrate Guardian's core safety and translation modules to the judges.</p>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <Card 
              key={scenario.id} 
              className={`cursor-pointer transition-all border presentation-card ${
                activeScenario?.id === scenario.id 
                  ? "border-[#087449] ring-2 ring-[#dcefe3]" 
                  : "border-gray-200 hover:border-green-300"
              }`}
              onClick={() => runScenario(scenario)}
            >
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                {scenarioIcons[scenario.id]}
                <div>
                  <CardTitle className="text-lg font-bold">{scenario.title}</CardTitle>
                  <CardDescription className="text-xs">Prepared Scenario Fixture</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{scenario.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 min-h-[300px] flex flex-col justify-center">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
              <Loader2 className="w-10 h-10 animate-spin text-[#087449]" />
              <p className="text-lg font-medium">Analyzing scenario input against Guardian AI safety engine...</p>
            </div>
          )}

          {!isAnalyzing && !result && (
            <div className="text-center py-12 space-y-3">
              <Lightbulb className="w-12 h-12 text-yellow-500 mx-auto animate-pulse" />
              <h3 className="text-xl font-serif font-bold">Select a Scenario Above</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Click any of the three judge journey cards to run an instant analysis and output Guardian's localized safety response.
              </p>
            </div>
          )}

          {!isAnalyzing && result && activeScenario && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-gray-100">
                <div>
                  <Badge variant="outline" className="mb-2 bg-gray-50 uppercase tracking-wider text-xs font-bold">
                    {result.kind} Analyzer
                  </Badge>
                  <h2 className="text-2xl font-serif font-bold">{activeScenario.title}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleReadAloud} className="font-bold border-green-700 text-green-700">
                    <Volume2 className="w-4 h-4 mr-2" />
                    {playingVoice ? "Stop Reading" : "Read Aloud"}
                  </Button>
                  <Badge 
                    className={`text-sm font-bold border-none px-3 py-1 ${
                      result.riskLevel === "low" ? "bg-green-100 text-green-800" : 
                      result.riskLevel === "medium" ? "bg-yellow-100 text-yellow-800" : 
                      "bg-red-100 text-red-800"
                    }`}
                  >
                    {result.riskLevel?.toUpperCase()} RISK
                  </Badge>
                </div>
              </div>

              {/* Input section */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase">Input Analyzed:</span>
                <p className="mt-1 font-serif text-[#102a22] italic">"{activeScenario.inputData.text}"</p>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Guardian Summary:</span>
                <p className="text-lg leading-relaxed text-[#102a22]">{result.explanation}</p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {result.evidence && result.evidence.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Evidence Detected:</span>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600">
                      {result.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.actions && result.actions.length > 0 && (
                  <div className="space-y-2 p-4 bg-green-50/50 rounded-xl border border-green-100/50">
                    <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Safe Next Steps:</span>
                    <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-700">
                      {result.actions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {result.disclaimer && (
                <p className="text-xs text-gray-400 italic pt-6 border-t border-gray-100">{result.disclaimer}</p>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 border-t mt-12 bg-white" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-6xl mx-auto px-4 flex justify-between text-xs text-gray-400">
          <span>Guardian · Presentation Companion</span>
          <span>Prepared Scenario mode is offline-compatible</span>
        </div>
      </footer>
    </div>
  );
}
