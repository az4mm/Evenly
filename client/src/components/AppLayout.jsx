import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  UserPlus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Scissors,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/join', label: 'Join Group', icon: UserPlus },
];

export default function AppLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const profilePic = user?.user_metadata?.avatar_url;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar-bg text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
            <Scissors className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-sidebar-primary-foreground">
              Evenly
            </span>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                    : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section + collapse toggle */}
        <div className="border-t border-sidebar-border p-2 space-y-2">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* User profile */}
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Avatar className="h-8 w-8 shrink-0">
              {profilePic ? (
                <AvatarImage src={profilePic} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">
                  {displayName}
                </p>
              </div>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-red-400 transition-colors w-full ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-sidebar-bg border-t border-sidebar-border z-50">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-sidebar-primary-foreground'
                    : 'text-sidebar-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1.5 rounded-xl transition-colors ${
                      isActive ? 'bg-sidebar-primary' : ''
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Profile button on mobile */}
          <button
            onClick={signOut}
            className="flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium text-sidebar-muted"
          >
            <div className="p-1.5">
              <Avatar className="h-5 w-5">
                {profilePic ? (
                  <AvatarImage src={profilePic} alt={displayName} />
                ) : null}
                <AvatarFallback className="text-[8px] bg-sidebar-accent text-sidebar-accent-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
