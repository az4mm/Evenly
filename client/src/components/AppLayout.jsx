import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  UserPlus,
  LogOut,
  Scissors,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/join', label: 'Join Group', icon: UserPlus },
];

export default function AppLayout({ children }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // Sidebar starts open on desktop, hidden on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const profilePic = user?.user_metadata?.avatar_url;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--neu-bg)] text-foreground">

      {/* ─── Desktop Sidebar (Hidden on mobile) ─── */}
      <aside
        className={`hidden md:flex flex-col h-full border-r border-[var(--neu-shadow-dark)]/20 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
        style={{ background: 'var(--neu-bg)' }}
      >
        <div className="p-4 h-full flex flex-col w-full overflow-hidden">
          {/* Logo & Toggle */}
          <div className={`flex items-center gap-3 h-14 shrink-0 px-2 mb-4 ${sidebarOpen ? '' : 'justify-center px-0'}`}>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="neu-raised flex items-center justify-center w-10 h-10 rounded-xl shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Scissors className="h-5 w-5 text-primary" />
            </button>
            {sidebarOpen && <span className="text-xl font-bold tracking-tight">Evenly</span>}
          </div>

          <div className="neu-inset h-[3px] rounded-full mx-2 mb-4" />

          {/* Navigation Links */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'neu-inset text-primary font-semibold'
                      : 'neu-button text-muted-foreground hover:text-foreground'
                  } ${sidebarOpen ? '' : 'justify-center px-0'}`
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* ─── Main Area (Topbar + Content) ─── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden transition-all duration-300">
        
        {/* Topbar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 z-10" style={{ background: 'var(--neu-bg)' }}>
          {/* Left: Mobile Logo */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="neu-raised flex items-center justify-center w-10 h-10 rounded-xl shrink-0">
              <Scissors className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Evenly</span>
          </div>
          
          {/* Empty spacer on desktop to push theme toggle to right */}
          <div className="hidden md:block"></div>

          {/* Right: Theme Toggle & User Profile */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="neu-button h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* User Dropdown (Desktop only) */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="neu-raised flex items-center gap-2 px-2 py-1.5 rounded-xl hover:opacity-80 transition-opacity cursor-pointer">
                    <Avatar className="h-7 w-7">
                      {profilePic && <AvatarImage src={profilePic} alt={displayName} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:block pr-1">
                      {displayName.split(' ')[0]}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {displayName}
                    <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto w-full relative z-0 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* ─── Mobile Bottom Nav (light neumorphic) ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50 border-t border-[var(--neu-shadow-dark)]/10"
        style={{
          background: 'var(--neu-bg)',
          boxShadow: '0 -8px 20px var(--neu-shadow-dark)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'neu-inset' : ''}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Mobile User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none">
                <div className="p-1.5">
                  <Avatar className="h-5 w-5">
                    {profilePic && <AvatarImage src={profilePic} alt={displayName} />}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span>Profile</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={16} className="w-56 mb-2">
              <div className="px-2 py-1.5 text-sm font-medium">
                {displayName}
                <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}
