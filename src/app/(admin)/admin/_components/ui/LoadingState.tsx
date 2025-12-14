'use client';

/**
 * LoadingState Component
 *
 * Loading spinner with optional message
 */

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function LoadingState({ message, size = 'md' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className={`
          ${SIZE_CLASSES[size]}
          border-2 border-gray-200 dark:border-gray-700
          border-t-green-500
          rounded-full animate-spin
        `}
      />
      {message && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
}
