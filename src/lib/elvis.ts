import { prisma } from "./prisma";
import { auditLog } from "./utils";

interface ElvisPayload {
  action_id: string;
  action_type: string;
  status: string;
  extracted_fields: Record<string, unknown>;
  source: {
    raw_text: string;
    transcript: string | null;
    submitter: string;
  };
  callback_url: string;
}

export async function dispatchToElvis(actionItemId: string) {
  const webhookUrl = process.env.ELVIS_WEBHOOK_URL;
  const webhookSecret = process.env.ELVIS_WEBHOOK_SECRET;

  if (!webhookUrl) {
    console.warn("ELVIS_WEBHOOK_URL not configured, skipping dispatch");
    return;
  }

  const item = await prisma.actionItem.findUnique({
    where: { id: actionItemId },
    include: {
      intake: {
        include: { submitter: true },
      },
    },
  });

  if (!item) throw new Error("Action item not found");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";

  const payload: ElvisPayload = {
    action_id: item.id,
    action_type: item.actionType,
    status: item.status,
    extracted_fields: {
      ...JSON.parse(item.extractedFields || "{}"),
      ...JSON.parse(item.inferredFields || "{}"),
    },
    source: {
      raw_text: item.intake.rawText || "",
      transcript: item.intake.transcript,
      submitter: item.intake.submitter.email,
    },
    callback_url: `${baseUrl}/api/actions/${item.id}/callback`,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (webhookSecret) {
    headers["X-Webhook-Secret"] = webhookSecret;
  }

  // Update status to IN_PROGRESS
  await prisma.actionItem.update({
    where: { id: actionItemId },
    data: { status: "IN_PROGRESS" },
  });

  await auditLog("ELVIS_DISPATCHED", {
    actionItemId,
    metadata: { actionType: item.actionType },
  });

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Elvis webhook failed ${res.status}: ${text}`);
    // Revert to READY so it can be retried
    await prisma.actionItem.update({
      where: { id: actionItemId },
      data: { status: "READY" },
    });
    throw new Error(`Elvis webhook failed: ${res.status}`);
  }
}
