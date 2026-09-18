import nodemailer from "nodemailer";
import { config } from "../config.js";
import { getPool } from "../db.js";
import {
  COPY,
  displayName,
  employeeLabel,
  formatDueDate,
  SIGNATURE,
} from "../lib/copy.js";
import { uid } from "../lib/sla.js";

let transporter;

export function isMailConfigured() {
  return Boolean(config.mail.host && config.mail.user && config.mail.password);
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: {
        user: config.mail.user,
        pass: config.mail.password,
      },
    });
  }
  return transporter;
}

function uniqueByEmail(people) {
  const seen = new Set();
  const list = [];
  for (const person of people) {
    const email = String(person?.email || "").trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    list.push({ ...person, email });
  }
  return list;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildViewUrl(assessment, person) {
  const base = String(config.appUrl || "").replace(/\/$/, "");
  if (!base || !assessment?.id) return null;
  const isActor =
    person?.id &&
    (person.id === assessment.employeeId || person.id === assessment.managerId);
  const path = isActor
    ? `/app/review/${encodeURIComponent(assessment.id)}`
    : `/app/assessments/${encodeURIComponent(assessment.id)}`;
  return `${base}${path}`;
}

export async function loadStakeholders(assessment) {
  const db = await getPool();
  const ids = [
    assessment.employeeId,
    assessment.managerId,
    assessment.hodId,
    assessment.hrbpId,
  ].filter(Boolean);

  const people = [];
  if (ids.length) {
    const [rows] = await db.query(
      `SELECT id, name, email, designation FROM employees
       WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    people.push(...rows);
  }

  if (config.mail.hrbpEmail) {
    const already = people.some(
      (row) => String(row.email || "").toLowerCase() === config.mail.hrbpEmail.toLowerCase(),
    );
    if (!already) {
      people.push({
        id: "HRBP-CONFIG",
        name: "HR Business Partner",
        email: config.mail.hrbpEmail,
        designation: "HRBP",
      });
    }
  }

  const employee = people.find((row) => row.id === assessment.employeeId) || null;
  const manager = people.find((row) => row.id === assessment.managerId) || null;
  const hod = people.find((row) => row.id === assessment.hodId) || null;
  const hrbp =
    people.find((row) => row.id === assessment.hrbpId) ||
    people.find((row) => row.id === "HRBP-CONFIG") ||
    null;

  return {
    employee,
    manager,
    hod,
    hrbp,
    people,
    names: {
      employeeName: displayName(employee, "the employee"),
      employeeRole: String(employee?.designation || "").trim() || "Role",
      employeeLabel: employeeLabel(employee),
      managerName: displayName(manager, "the Reporting Manager"),
      hodName: displayName(hod, "the HOD"),
      hrbpName: displayName(hrbp, "HR Business Partner"),
      dueDate: formatDueDate(assessment.sla?.dueAt),
    },
  };
}

function recipientsFor(audience, ctx) {
  if (audience === "EMPLOYEE") return uniqueByEmail([ctx.employee]);
  if (audience === "MANAGER") return uniqueByEmail([ctx.manager]);
  if (audience === "HOD") return uniqueByEmail([ctx.hod]);
  if (audience === "HRBP") return uniqueByEmail([ctx.hrbp]);
  if (audience === "LEADERSHIP") return uniqueByEmail([ctx.manager, ctx.hod, ctx.hrbp]);
  return uniqueByEmail([ctx.employee, ctx.manager, ctx.hod, ctx.hrbp]);
}

function renderText({ dear, paragraphs, bullets, closing, viewUrl }) {
  const lines = [`Dear ${dear},`, ""];
  for (const paragraph of paragraphs || []) {
    lines.push(paragraph, "");
  }
  if (bullets?.length) {
    for (const item of bullets) lines.push(`•\t${item}`);
    lines.push("");
  }
  for (const paragraph of closing || []) {
    lines.push(paragraph, "");
  }
  if (viewUrl) {
    lines.push("View Now:", viewUrl, "");
  }
  lines.push(...SIGNATURE);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function renderHtml({ dear, title, paragraphs, bullets, closing, viewUrl }) {
  const blocks = [
    `<p style="margin:0 0 16px 0;">Dear ${escapeHtml(dear)},</p>`,
    ...(paragraphs || []).map(
      (paragraph) =>
        `<p style="margin:0 0 16px 0;">${escapeHtml(paragraph)}</p>`,
    ),
  ];
  if (bullets?.length) {
    blocks.push(
      `<ul style="margin:0 0 16px 0;padding-left:20px;">${bullets
        .map((item) => `<li style="margin:0 0 6px 0;">${escapeHtml(item)}</li>`)
        .join("")}</ul>`,
    );
  }
  for (const paragraph of closing || []) {
    blocks.push(`<p style="margin:0 0 16px 0;">${escapeHtml(paragraph)}</p>`);
  }
  if (viewUrl) {
    blocks.push(
      `<p style="margin:24px 0 8px 0;">
        <a href="${escapeHtml(viewUrl)}"
           style="display:inline-block;background:#b4532a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.01em;">
          View Now
        </a>
      </p>
      <p style="margin:0 0 16px 0;font-size:12px;color:#7a6a5c;">
        Or open this link: <a href="${escapeHtml(viewUrl)}" style="color:#b4532a;">${escapeHtml(viewUrl)}</a>
      </p>`,
    );
  }
  blocks.push(
    `<p style="margin:24px 0 0 0;">${SIGNATURE.map((line) => escapeHtml(line)).join("<br>")}</p>`,
  );

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f6f3ef;font-family:Arial,sans-serif;color:#2b241c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #eadfd3;border-radius:12px;">
            <tr>
              <td style="padding:24px 28px 8px 28px;">
                <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#b4532a;font-weight:700;">Job Clarity Management</p>
                <h1 style="margin:10px 0 0 0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px 28px;font-size:15px;line-height:1.7;color:#3f342b;">
                ${blocks.join("")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function recordMailLog({ assessmentId, recipients, subject, body, status, error }) {
  try {
    const db = await getPool();
    await db.query(
      `INSERT INTO mail_logs (id, assessment_id, recipients, subject, body, status, error_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uid("ML"),
        assessmentId,
        JSON.stringify(recipients),
        subject,
        body,
        status,
        error || null,
      ],
    );
  } catch (logError) {
    console.error("Could not write mail log:", logError);
  }
}

async function sendJob(assessment, ctx, job) {
  if (!job) return { sent: false, recipients: [], reason: "No mail job" };
  const people = recipientsFor(job.audience, ctx);
  if (!people.length) {
    await recordMailLog({
      assessmentId: assessment.id,
      recipients: [],
      subject: job.subject,
      body: (job.paragraphs || []).join("\n\n"),
      status: "skipped",
      error: `No ${String(job.audience || "stakeholder").toLowerCase()} email address was found.`,
    });
    return { sent: false, recipients: [], reason: "No recipients" };
  }

  const tx = getTransporter();
  const sentTo = [];
  for (const person of people) {
    const dear = displayName(person, "Colleague");
    const viewUrl = buildViewUrl(assessment, person);
    const text = renderText({
      dear,
      paragraphs: job.paragraphs,
      bullets: job.bullets,
      closing: job.closing,
      viewUrl,
    });
    const html = renderHtml({
      dear,
      title: job.subject,
      paragraphs: job.paragraphs,
      bullets: job.bullets,
      closing: job.closing,
      viewUrl,
    });

    if (!tx) {
      console.warn("SMTP is not configured. Email was not sent:", job.subject);
      await recordMailLog({
        assessmentId: assessment.id,
        recipients: [person.email],
        subject: job.subject,
        body: text,
        status: "skipped",
        error: "SMTP is not configured.",
      });
      continue;
    }

    try {
      await tx.sendMail({
        from: config.mail.from,
        to: person.email,
        cc: config.mail.cc.length ? config.mail.cc.join(", ") : undefined,
        subject: job.subject,
        text,
        html,
      });
      await recordMailLog({
        assessmentId: assessment.id,
        recipients: [person.email],
        subject: job.subject,
        body: text,
        status: "sent",
      });
      sentTo.push(person.email);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mail send failed.";
      console.error("Email failed:", message);
      await recordMailLog({
        assessmentId: assessment.id,
        recipients: [person.email],
        subject: job.subject,
        body: text,
        status: "failed",
        error: message,
      });
    }
  }

  return {
    sent: sentTo.length > 0,
    recipients: sentTo,
    reason: tx ? undefined : "SMTP not configured",
  };
}

async function dispatch(assessment, jobs) {
  const ctx = await loadStakeholders(assessment);
  const list = (Array.isArray(jobs) ? jobs : [jobs]).filter(Boolean);
  const results = [];
  for (const job of list) {
    results.push(await sendJob(assessment, ctx, typeof job === "function" ? job(ctx.names) : job));
  }
  return results[0] || { sent: false, recipients: [] };
}

export async function sendYesClarityEmails(assessment) {
  return dispatch(assessment, [COPY.yes.employeeMail, COPY.yes.hrbpMail]);
}

export async function sendNoClarityEmails(assessment) {
  return dispatch(assessment, [COPY.no.employeeMail]);
}

export async function sendPartialClarityEmails(assessment) {
  return dispatch(assessment, [COPY.partial.employeeMail]);
}

export async function sendSelfSubmitEmails(assessment) {
  return dispatch(assessment, [COPY.selfSubmit.managerMail, COPY.selfSubmit.hrbpMail]);
}

export async function sendManagerSubmitEmails(assessment) {
  return dispatch(assessment, [COPY.managerSubmit.employeeMail, COPY.managerSubmit.hrbpMail]);
}

export async function sendAlignedEmails(assessment) {
  return dispatch(assessment, [
    COPY.aligned.employeeMail,
    COPY.aligned.hodMail,
    COPY.aligned.hrbpMail,
  ]);
}

export async function sendNotAlignedEmails(assessment) {
  return dispatch(assessment, [
    COPY.notAligned.employeeMail,
    COPY.notAligned.leadershipMail,
  ]);
}

export async function sendConversationDoneEmails(assessment) {
  return dispatch(assessment, [
    COPY.conversationDone.employeeMail,
    COPY.conversationDone.hodMail,
    COPY.conversationDone.hrbpMail,
  ]);
}

export async function sendClosureEmails(assessment) {
  const hadConversation = assessment.alignmentConversation?.status === "COMPLETED";
  return dispatch(assessment, [
    hadConversation ? COPY.closed.mailEveryone : COPY.closed.mailEveryoneWithoutConversation,
  ]);
}

export async function sendManagerTaskAssignedEmail(assessment) {
  return sendSelfSubmitEmails(assessment);
}

export async function sendReminderEmails(assessment) {
  const ctx = await loadStakeholders(assessment);
  const copy = COPY.reminder.mail(ctx.names);
  const notice = COPY.reminder.notice({
    employeeLabel: ctx.names.employeeLabel,
    dueDate: ctx.names.dueDate,
  });
  return dispatch(assessment, [
    {
      audience: reminderAudience(assessment.status),
      subject: copy.subject,
      paragraphs: [notice.message],
    },
  ]);
}

function reminderAudience(status) {
  if (status === "MANAGER_ASSESSMENT_PENDING") {
    return "MANAGER";
  }
  if (status === "HOD_SIGNOFF_PENDING" || status === "ROLE_ALIGNMENT_COMPLETED") {
    return "HOD";
  }
  if (status === "ROLE_ALIGNMENT_IN_PROGRESS" || status === "ROLE_ALIGNMENT_REQUIRED") {
    return "LEADERSHIP";
  }
  return "EMPLOYEE";
}

export async function sendInitialCheckDigestMail({
  assessmentId,
  recipients,
  subject,
  bodyIntro,
  bodyOutro,
  pendingCount = 0,
  trigger = "manual",
  attachment = null,
}) {
  const paragraphs = [
    bodyIntro,
    `Active employees yet to start the Initial Role Clarity Check: ${pendingCount}.`,
    attachment
      ? "Please find the attached Excel report. Each sheet is named by workflow status (for example INITIAL_CLARITY_CHECK, SELF_ASSESSMENT_PENDING, MANAGER_ASSESSMENT_PENDING)."
      : null,
    `Trigger: ${trigger === "auto" ? "Scheduled" : "Manual"}.`,
  ].filter(Boolean);
  const closing = [bodyOutro];
  const tx = getTransporter();
  const sentTo = [];
  const attachments = attachment
    ? [
        {
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        },
      ]
    : undefined;

  for (const person of recipients) {
    const dear = displayName(person, "Colleague");
    const text = renderText({
      dear,
      paragraphs,
      closing,
    });
    const html = renderHtml({
      dear,
      title: subject,
      paragraphs,
      closing,
    });

    if (!tx) {
      console.warn("SMTP is not configured. Digest email was not sent:", subject);
      await recordMailLog({
        assessmentId,
        recipients: [person.email],
        subject,
        body: text,
        status: "skipped",
        error: "SMTP is not configured.",
      });
      continue;
    }

    try {
      await tx.sendMail({
        from: config.mail.from,
        to: person.email,
        cc: config.mail.cc.length ? config.mail.cc.join(", ") : undefined,
        subject,
        text,
        html,
        attachments,
      });
      await recordMailLog({
        assessmentId,
        recipients: [person.email],
        subject,
        body: text,
        status: "sent",
      });
      sentTo.push(person.email);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mail send failed.";
      console.error("Digest email failed:", message);
      await recordMailLog({
        assessmentId,
        recipients: [person.email],
        subject,
        body: text,
        status: "failed",
        error: message,
      });
    }
  }

  return {
    sent: sentTo.length > 0,
    recipients: sentTo,
    reason: tx ? undefined : "SMTP not configured",
  };
}

export { COPY };
