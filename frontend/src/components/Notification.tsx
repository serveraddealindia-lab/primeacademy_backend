import React from 'react';

export type NotificationVariant = 'danger';

export interface NotificationProps {
  open: boolean;
  variant?: NotificationVariant;
  message: string;
  onDismiss: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ open, variant = 'danger', message, onDismiss }) => {
  if (!open) return null;

  const base =
    'fixed bottom-4 right-4 z-[60] w-[320px] max-w-[calc(100vw-2rem)] rounded-lg shadow-lg border p-4';
  const styles =
    variant === 'danger'
      ? 'bg-red-600 text-white border-red-700'
      : 'bg-gray-900 text-white border-gray-800';

  return (
    <div className={`${base} ${styles}`} role="alert" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm leading-5">{message}</div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-white/90 hover:text-white text-xs font-semibold px-2 py-1 rounded bg-white/10 hover:bg-white/20"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

