export default function SlaBreachNotice({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800">
      <i className="ri-alarm-warning-line mr-1.5" />
      {message}
    </p>
  );
}
