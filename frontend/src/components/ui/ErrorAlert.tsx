interface ErrorAlertProps {
  message: string
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="text-[var(--accent-red)] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg p-4 text-base">
      {message}
    </div>
  )
}
