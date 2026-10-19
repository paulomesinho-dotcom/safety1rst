import React from 'react';
import { Search } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { SettingsMenu } from './SettingsMenu';
import { HelpButton } from './HelpButton';
import { FullScreenToggle } from './FullScreenToggle';
import { useStore } from '@/store/useStore';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
    const params = useParams();
    const projectId = params?.id as string;
    const { currentUser, getUserRoleInProject } = useStore();

    const userRole = currentUser && projectId ? getUserRoleInProject(currentUser.id, projectId) : null;

    return (
        <header className="h-16 px-4 flex items-center justify-between bg-background border-b border-gray-100 dark:border-[#444746] sticky top-0 z-[100]">
            {/* Search Bar or Breadcrumbs placeholder */}
            <div className="flex-1 max-w-3xl ml-2">
                {/* Existing search bar logic or replacement */}
                <div className="relative group w-96 hidden md:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-brand transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="block w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#131314] border border-gray-200 dark:border-[#444746] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-[#1e1f20] focus:ring-2 focus:ring-blue-100 focus:border-brand transition-all outline-none"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-4">
                <FullScreenToggle />
                <HelpButton />
                <SettingsMenu />

                {/* Separator just before User Menu if needed, or remove to be cleaner */}
                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                <UserMenu />
            </div>
        </header>
    );
};

export default Header;
