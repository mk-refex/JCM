export const seedNotifications = [
  {
    id: "NT-3001",
    assessmentId: "AS-2001",
    recipientId: "U-MGR1",
    recipientName: "Priya Nair",
    event: "MANAGER_ASSESSMENT_ASSIGNED",
    title: "Manager Assessment assigned",
    message:
      "Vikram Singhal (Senior Engineer – Solar) has submitted the self assessment. Please complete your independent assessment.",
    createdAt: "2026-09-08T09:01:00.000Z",
    read: false,
  },
  {
    id: "NT-3002",
    assessmentId: "AS-2001",
    recipientId: "U-ADMIN",
    recipientName: "Ananya Sharma",
    event: "SLA_BREACH",
    title: "SLA breached — Manager Assessment",
    message:
      "The Manager Assessment for Vikram Singhal has crossed its working-day SLA.",
    createdAt: "2026-09-14T06:00:00.000Z",
    read: false,
  },
  {
    id: "NT-3003",
    assessmentId: "AS-2002",
    recipientId: "U-EMP2",
    recipientName: "Divya Krishnan",
    event: "EMPLOYEE_ALIGNMENT_REQUIRED",
    title: "Confirm alignment of role expectations",
    message:
      "Your reporting manager has submitted the assessment. Please confirm whether the role expectations are aligned with your understanding.",
    createdAt: "2026-09-11T10:01:00.000Z",
    read: false,
  },
  {
    id: "NT-3004",
    assessmentId: "AS-2004",
    recipientId: "U-HRBP2",
    recipientName: "Karthik Rao",
    event: "NOT_ALIGNED",
    title: "Role Alignment Conversation required",
    message:
      "Nisha Gupta has indicated the role expectations are not aligned. A Role Alignment Conversation is required.",
    createdAt: "2026-09-12T07:46:00.000Z",
    read: false,
  },
  {
    id: "NT-3005",
    assessmentId: "AS-2003",
    recipientId: "U-HOD",
    recipientName: "Rajesh Menon",
    event: "HOD_SIGNOFF_REQUIRED",
    title: "HOD final sign-off required",
    message:
      "Rahul Verma confirmed alignment. The case is awaiting your final comments and sign-off.",
    createdAt: "2026-09-10T09:21:00.000Z",
    read: false,
  },
  {
    id: "NT-3006",
    assessmentId: "AS-2005",
    recipientId: "U-EMP1",
    recipientName: "Vikram Singhal",
    event: "FINAL_CLOSURE",
    title: "Role Clarity Review completed",
    message:
      "The Role Clarity Review for Suresh Babu has been completed and formally closed.",
    createdAt: "2026-09-05T09:05:00.000Z",
    read: true,
  },
  {
    id: "NT-3007",
    assessmentId: "AS-2007",
    recipientId: "U-HRBP1",
    recipientName: "Meera Iyer",
    event: "ALIGNMENT_CONVERSATION_REQUIRED",
    title: "Alignment conversation in progress",
    message:
      "Amit Joshi's Role Alignment Conversation is scheduled. HRBP comments are required during the conversation.",
    createdAt: "2026-09-12T12:01:00.000Z",
    read: false,
  },
];

export default seedNotifications;