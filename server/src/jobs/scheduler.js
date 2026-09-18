import cron from "node-cron";
import { getInitialCheckDigest } from "../services/settings.js";
import {
  dispatchInitialCheckDigest,
  shouldRunDigestNow,
} from "../services/initialCheckDigest.js";

let started = false;

export function startSchedulers() {
  if (started) return;
  started = true;

  // Every minute — matches configured HH:mm in the digest timezone.
  cron.schedule("* * * * *", async () => {
    try {
      const digest = await getInitialCheckDigest();
      const decision = shouldRunDigestNow(digest);
      if (!decision.run) return;

      console.log(
        `[scheduler] Initial-check digest auto-send (${decision.sentKey})…`,
      );
      const result = await dispatchInitialCheckDigest({
        trigger: "auto",
        sentKey: decision.sentKey,
      });
      console.log(
        `[scheduler] Digest sent to ${result.recipientCount} recipient(s); pending=${result.pendingCount}.`,
      );
    } catch (error) {
      console.error(
        "[scheduler] Initial-check digest failed:",
        error instanceof Error ? error.message : error,
      );
    }
  });

  console.log("Schedulers started (initial-check digest cron).");
}
