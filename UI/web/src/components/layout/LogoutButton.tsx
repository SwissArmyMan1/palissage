import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';

/**
 * Sign out of the current role and return to the sign-in screen so another
 * role can be chosen. `icon` variant for compact top bars, `full` for the
 * sidebar footer.
 */
export function LogoutButton({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'icon';
  className?: string;
}) {
  const { disconnect } = useSession();
  const navigate = useNavigate();

  const handle = () => {
    disconnect();
    navigate('/sign-in');
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handle}
        aria-label="Log out"
        title="Log out"
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-page-subtle hover:text-fg',
          className,
        )}
      >
        <LogOut size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={cn(
        'flex h-10 items-center justify-center gap-2 rounded-md border border-line t-small-strong text-fg-secondary transition-colors hover:bg-page-subtle hover:text-fg',
        className,
      )}
    >
      <LogOut size={16} /> Log out
    </button>
  );
}
