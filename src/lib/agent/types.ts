export type Lang = "pt-BR" | "es";

export type AgentState =
  | "greeting"
  | "consent"
  | "intake"
  | "documents"
  | "review"
  | "confirm"
  | "handoff";

export type Urgency = "low" | "normal" | "high";

export type Intake = {
  clientName?: string;
  matterArea?: string;
  opposingParty?: string;
  timeline?: string;
  desiredOutcome?: string;
  urgency?: Urgency;
  facts?: string;
};

export type ReviewJson = {
  documentTypeGuess: string;
  keyClauses: string[];
  missingItems: string[];
  redFlags: string[];
  questionsForLawyer: string[];
  clientSafeRecap: string;
};

export type Button = { id: string; title: string };

export type ListRow = { id: string; title: string; description?: string };

export type Outbound = {
  text: string;
  buttons?: Button[];
  list?: { button: string; rows: ListRow[] };
};

export type Inbound = {
  waId: string;
  waMessageId?: string;
  text?: string;
  buttonId?: string;
  media?: { id: string; mimeType: string; filename?: string; type: string };
};
