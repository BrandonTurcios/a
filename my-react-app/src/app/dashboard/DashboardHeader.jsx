import React from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Search, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import LanguageSelector from '../../components/LanguageSelector';
import { cn } from '../../lib/utils';

const DashboardHeader = ({ sessionData, onLogout, onToggleSidebar, onLanguageChange }) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = React.useState('');

  return (
    <TooltipProvider>
      <header className={cn(
        "bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600",
        "px-6 flex items-center justify-between",
        "shadow-lg shadow-primary-900/30",
        "fixed top-0 left-0 right-0 z-[1000] h-[72px]",
        "border-b-[3px] border-secondary-400"
      )}>
        {/* Left: Menu button + Logo + Title */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="mr-4 text-white hover:bg-white/20 h-10 w-10 rounded-xl transition-all"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-11 h-11 rounded-xl",
              "bg-gradient-to-br from-secondary-500 to-secondary-400",
              "flex items-center justify-center",
              "shadow-lg shadow-secondary-500/40",
              "border-2 border-white/30"
            )}>
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <h1 className={cn(
              "text-white text-2xl font-semibold m-0",
              "drop-shadow-md tracking-wide"
            )}>
              {t('header.title')}
            </h1>
          </div>
        </div>

        {/* Center/Right: Search + User */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-600" />
            <Input
              placeholder={t('header.searchPlaceholder')}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className={cn(
                "w-[360px] pl-10 pr-4",
                "bg-white/95 border-2 border-white/50",
                "rounded-xl shadow-lg",
                "focus-visible:border-secondary-400 focus-visible:shadow-xl focus-visible:shadow-secondary-400/30",
                "transition-all"
              )}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2.5 px-4 py-2",
              "bg-white/20 backdrop-blur-md",
              "rounded-xl border-2 border-white/30",
              "hover:bg-white/30 hover:border-white/50",
              "transition-all cursor-pointer"
            )}>
              <Avatar className="h-9 w-9 border-2 border-white/50 shadow-lg shadow-secondary-500/40">
                <AvatarFallback className="bg-gradient-to-br from-secondary-500 to-secondary-400 text-white text-base font-bold">
                  {sessionData?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-white text-sm font-semibold leading-tight drop-shadow-sm">
                  {sessionData?.username || t('header.defaultUser')}
                </span>
                <span className="text-white/85 text-[11px] leading-tight">
                  {sessionData?.database || t('header.database')}
                </span>
              </div>
            </div>
            <LanguageSelector
              value={sessionData?.language || 'en'}
              onChange={onLanguageChange}
              style={{ width: 180 }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  className={cn(
                    "text-white hover:bg-white/20",
                    "h-10 w-10 rounded-xl",
                    "transition-all"
                  )}
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('header.signOut')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default DashboardHeader;
