import { Axiom } from "@axiomhq/js";

const axiom = new Axiom({
  token: process.env.AXIOM_TOKEN,
  orgId: process.env.AXIOM_ORG_ID
});

const dataset = process.env.AXIOM_DATASET ?? "prelim";

export async function logInfo(event: string, data: Record<string, unknown>) {
  try {
    axiom.ingest(dataset, [{ level: "info", event, ...data }]);
    await axiom.flush();
  } catch (err) {
    console.error("axiom.logInfo failed", { event, err });
  }
}

export async function logError(event: string, data: Record<string, unknown>) {
  try {
    axiom.ingest(dataset, [{ level: "error", event, ...data }]);
    await axiom.flush();
  } catch (err) {
    console.error("axiom.logError failed", { event, err, data });
  }
}
