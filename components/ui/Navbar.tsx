import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'text-white' : 'text-zinc-400 hover:text-zinc-200';
  };

  return (
    <nav className="fixed top-0 z-40 w-full border-b border-gray-800 bg-black/50 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/home" className={isActive('/home')}>
              Home
            </Link>
            <Link href="/settings" className={isActive('/settings')}>
              Settings
            </Link>
            <Link href="/account" className={isActive('/account')}>
              Account
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 