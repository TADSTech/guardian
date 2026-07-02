export type AnalysisKind = "scam" | "document" | "voice" | "page";
export type RiskLevel = "low" | "medium" | "high";

export interface AnalysisRequest { kind: AnalysisKind; fixtureKey?: string; input: { text?: string; fileName?: string; url?: string }; }
export interface AnalysisResult { kind: AnalysisKind; riskLevel?: RiskLevel; riskScore?: number; explanation: string; evidence: string[]; actions: string[]; disclaimer?: string; }
