export function employeeLabel(employee) {
  const name = String(employee?.name || "").trim() || "the employee";
  const role = String(employee?.designation || "").trim();
  return role ? `${name} – ${role}` : name;
}

export function formatDueDate(value) {
  if (!value) return "the assigned due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the assigned due date";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function displayName(person, fallback) {
  const name = String(person?.name || "").trim();
  return name || fallback;
}

export const SIGNATURE = ["Regards,", "Team HR"];

export const COPY = {
  yes: {
    employeeNotice: {
      title: "Role Clarity Confirmed",
      message:
        "You have indicated that you have clarity on your current role and expectations. No further action is required from you at this stage.",
    },
    employeeMail: ({ employeeName }) => ({
      audience: "EMPLOYEE",
      subject: "Role Clarity Review – Completed",
      paragraphs: [
        `Thank you for completing the Role Clarity Check.`,
        `You have indicated that you have clarity on your current role and expectations. No further action is required from your end at this stage.`,
        `Should you require any clarification regarding your role in the future, please reach out to your Reporting Manager or HR Business Partner.`,
      ],
    }),
    hrbpMail: ({ employeeName }) => ({
      audience: "HRBP",
      subject: `Role Clarity Review – ${employeeName} – Clarity Confirmed`,
      paragraphs: [
        `This is to inform you that ${employeeName} has completed the Role Clarity Check and indicated that they have clarity on their current role and expectations.`,
        `No further action is required.`,
      ],
    }),
  },

  no: {
    employeeNotice: {
      title: "Role Clarity Assessment Required",
      message:
        "You have indicated that you do not currently have sufficient clarity on your role and expectations. Please complete the detailed Role Clarity Self-Assessment to identify the areas requiring clarification.",
    },
    employeeMail: ({ dueDate }) => ({
      audience: "EMPLOYEE",
      subject: "Action Required – Complete Your Role Clarity Self-Assessment",
      paragraphs: [
        `You have indicated that you require greater clarity on your current role and expectations.`,
        `Please complete the Role Clarity Self-Assessment, including:`,
      ],
      bullets: [
        "Your key job responsibilities and deliverables",
        "Your clarity rating across the seven role dimensions",
        "Specific areas where you require further clarification",
      ],
      closing: [`Please complete the assessment by ${dueDate}.`],
    }),
  },

  partial: {
    employeeNotice: {
      title: "Role Clarity Assessment – Further Clarification Required",
      message:
        "You have indicated that you have partial clarity on your role. Please complete the Role Clarity Self-Assessment and identify the specific areas where you require further clarification or alignment.",
    },
    employeeMail: ({ dueDate }) => ({
      audience: "EMPLOYEE",
      subject: "Action Required – Role Clarity Self-Assessment",
      paragraphs: [
        `You have indicated that you have partial clarity regarding your current role and expectations.`,
        `We invite you to complete the Role Clarity Self-Assessment to help identify the specific areas where further clarification or alignment may be required.`,
        `Please complete the assessment by ${dueDate}.`,
      ],
    }),
  },

  selfSubmit: {
    managerNotice: ({ employeeName, dueDate }) => ({
      title: "Role Clarity Assessment Awaiting Your Action",
      message: `${employeeName} has completed the Role Clarity Self-Assessment. Please complete your independent assessment of the role expectations by ${dueDate}.`,
    }),
    managerMail: ({ employeeName, dueDate }) => ({
      audience: "MANAGER",
      subject: `Action Required – Role Clarity Assessment | ${employeeName}`,
      paragraphs: [
        `${employeeName} has completed the Role Clarity Self-Assessment.`,
        `You are now required to independently assess the role across the seven Role Clarity dimensions.`,
        `Important: The employee's assessment and responses will remain hidden until you submit your independent assessment.`,
        `Once submitted, you will be able to review the employee's responses and provide your comments/coaching notes and role expectations.`,
        `Please complete your assessment by ${dueDate}.`,
      ],
    }),
    hrbpMail: ({ employeeName, managerName }) => ({
      audience: "HRBP",
      subject: `Role Clarity Review Initiated – ${employeeName}`,
      paragraphs: [
        `${employeeName} has completed the Role Clarity Self-Assessment and the assessment has been routed to ${managerName} for independent assessment.`,
        `No action is required from you at this stage. You will receive further notification if the process requires your involvement.`,
      ],
    }),
  },

  managerSubmit: {
    employeeNotice: {
      title: "Manager Assessment Completed – Alignment Required",
      message:
        "Your Reporting Manager has completed the independent Role Clarity Assessment. Please review the role expectations and comments provided and indicate whether you are Aligned or Not Aligned.",
    },
    employeeMail: ({ dueDate }) => ({
      audience: "EMPLOYEE",
      subject: "Action Required – Review Role Expectations & Confirm Alignment",
      paragraphs: [
        `Your Reporting Manager has completed the independent Role Clarity Assessment and provided comments/role expectations.`,
        `Please review the information and indicate whether you consider the role expectations to be:`,
      ],
      bullets: [
        "Aligned – The role expectations are clear and aligned with your understanding.",
        "Not Aligned – You require further discussion/clarification on the role expectations.",
      ],
      closing: [`Please complete the alignment check by ${dueDate}.`],
    }),
    hrbpMail: ({ employeeName }) => ({
      audience: "HRBP",
      subject: `Role Clarity Assessment – Manager Review Completed | ${employeeName}`,
      paragraphs: [
        `The Reporting Manager has completed the independent assessment and provided role expectations/comments for ${employeeName}.`,
      ],
    }),
  },

  aligned: {
    employeeNotice: {
      title: "Role Alignment Confirmed",
      message:
        "You have confirmed that the role expectations and clarifications provided by your Reporting Manager are aligned with your understanding. The assessment has now been routed to the HOD for final sign-off.",
    },
    hodNotice: ({ employeeName }) => ({
      title: "HOD Sign-Off Required",
      message: `${employeeName} and the Reporting Manager have completed the Role Clarity Review, and the employee has confirmed alignment with the role expectations. Please review and provide final sign-off.`,
    }),
    hrbpNotice: ({ employeeName, hodName }) => ({
      title: "Role Alignment Confirmed",
      message: `${employeeName} has confirmed alignment with the role expectations provided by the Reporting Manager. The case has been routed to ${hodName} for final sign-off.`,
    }),
    hodMail: ({ employeeName, dueDate }) => ({
      audience: "HOD",
      subject: `Action Required – Final Sign-Off | Role Clarity – ${employeeName}`,
      paragraphs: [
        `The Role Clarity Review for ${employeeName} has been completed by the employee and Reporting Manager.`,
        `The employee has confirmed that the role expectations and clarifications provided are aligned with their understanding.`,
        `The assessment is now pending your final review and sign-off.`,
        `Please complete the sign-off by ${dueDate}.`,
      ],
      cta: "[Review & Sign Off]",
    }),
  },

  notAligned: {
    notice: {
      title: "Role Alignment Conversation Required",
      message:
        "The employee has indicated that the role expectations and clarifications provided are not yet fully aligned with their understanding of the role. A Role Alignment Conversation involving the Employee, Reporting Manager, HOD and HRBP is required to establish a shared understanding of the role and expectations.",
    },
    leadershipMail: ({ employeeName }) => ({
      audience: "LEADERSHIP",
      subject: `Action Required – Role Alignment Conversation | ${employeeName}`,
      paragraphs: [
        `As part of the Role Clarity Review, ${employeeName} has indicated that the role expectations/clarifications provided are not yet aligned with their understanding of the role.`,
        `The case therefore requires a Role Alignment Conversation involving the Employee, Reporting Manager, HOD and HRBP.`,
        `The purpose of the conversation is to establish a shared understanding of:`,
      ],
      bullets: [
        "Role purpose and contribution",
        "Key responsibilities and deliverables",
        "Decision-making authority and boundaries",
        "Success measures and expectations",
        "Key interfaces/stakeholders",
        "Other areas identified during the assessment",
      ],
      closing: [
        "Please use this conversation as an opportunity to clarify expectations and establish alignment.",
      ],
    }),
  },

  conversationDone: {
    hodNotice: ({ employeeName }) => ({
      title: "Alignment Conversation Completed – HOD Closure Required",
      message: `The Role Alignment Conversation for ${employeeName} has been completed. Please record the final outcome/comments and provide HOD sign-off to close the Role Clarity Review.`,
    }),
    hrbpNotice: ({ employeeName }) => ({
      title: "Role Alignment Conversation Completed",
      message: `The Role Alignment Conversation for ${employeeName} has been completed. Please add any relevant HRBP observations/comments before HOD final sign-off.`,
    }),
  },

  closed: {
    notice: ({ employeeName }) => ({
      title: "Role Clarity Review Completed",
      message: `The Role Clarity Review for ${employeeName} has been completed and formally signed off by the HOD. The role expectations have been clarified and alignment has been established through the Role Alignment Conversation.`,
    }),
    noticeWithoutConversation: ({ employeeName }) => ({
      title: "Role Clarity Review Completed",
      message: `The Role Clarity Review for ${employeeName} has been completed and formally signed off by the HOD.`,
    }),
    mailEveryone: ({ employeeName, employeeRole }) => ({
      audience: "ALL",
      subject: `Role Clarity Review Completed – ${employeeName}`,
      paragraphs: [
        `The Role Clarity Review for ${employeeName} – ${employeeRole} has been completed and formally signed off.`,
        `Following the Role Alignment Conversation, the role purpose, responsibilities, expectations and areas requiring clarification have been discussed and aligned among the relevant stakeholders.`,
        `The HOD has provided the final sign-off and the Role Clarity Review is now formally closed.`,
        `For any further queries or clarification relating to the role, please reach out to your respective HR Business Partner.`,
        `Thank you for your participation in the process.`,
      ],
    }),
    mailEveryoneWithoutConversation: ({ employeeName, employeeRole }) => ({
      audience: "ALL",
      subject: `Role Clarity Review Completed – ${employeeName}`,
      paragraphs: [
        `The Role Clarity Review for ${employeeName} – ${employeeRole} has been completed and formally signed off.`,
        `The employee confirmed that the role expectations and clarifications provided are aligned with their understanding.`,
        `The HOD has provided the final sign-off and the Role Clarity Review is now formally closed.`,
        `For any further queries or clarification relating to the role, please reach out to your respective HR Business Partner.`,
        `Thank you for your participation in the process.`,
      ],
    }),
  },

  reminder: {
    notice: ({ employeeLabel, dueDate }) => ({
      title: "Reminder: Role Clarity Action Pending",
      message: `Your Role Clarity action for ${employeeLabel} is pending. Please complete it by ${dueDate}.`,
    }),
    mail: ({ employeeName }) => ({
      subject: `Reminder – Role Clarity Action Due | ${employeeName}`,
    }),
  },
};

export const NOT_ALIGNED_MESSAGE = COPY.notAligned.notice.message;

export function closureMessage(label) {
  return COPY.closed.notice({ employeeName: label }).message;
}
