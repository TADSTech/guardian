export type DemoFixture = {
  id: "bank-otp" | "amoxicillin-prescription" | "voice-otp";
  kind: "scam" | "document" | "voice";
  title: string;
  prompt: string;
  mediaLabel: string;
};

export const demoFixtures: DemoFixture[] = [
  { id: "bank-otp", kind: "scam", title: "Urgent prize message", prompt: "A prize message asks for my bank details.", mediaLabel: "Scam screenshot" },
  { id: "amoxicillin-prescription", kind: "document", title: "Prescription", prompt: "What does this prescription mean?", mediaLabel: "Prescription image" },
  { id: "voice-otp", kind: "voice", title: "OTP voice note", prompt: "What does this message mean?", mediaLabel: "Voice note" },
];
