import { ReactNode } from 'react';

interface MobileTableProps {
  children: ReactNode;
  className?: string;
}

interface MobileTableCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

interface MobileTableRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MobileTable({ children, className = '' }: MobileTableProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {children}
    </div>
  );
}

export function MobileTableCard({ children, onClick, className = '' }: MobileTableCardProps) {
  const baseClasses = "bg-white rounded-lg border border-gray-200 p-4 space-y-3";
  const clickableClasses = onClick ? "cursor-pointer active:bg-gray-50 transition" : "";

  return (
    <div
      className={`${baseClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function MobileTableRow({ label, value, className = '' }: MobileTableRowProps) {
  return (
    <div className={`flex justify-between items-start gap-3 ${className}`}>
      <span className="text-sm text-gray-600 font-medium flex-shrink-0">{label}</span>
      <div className="text-sm text-gray-900 text-right flex-1">{value}</div>
    </div>
  );
}
