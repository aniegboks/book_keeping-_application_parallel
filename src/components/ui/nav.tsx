"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { 
  Home, BookOpen, Calendar, Users, Package, 
  Building, FolderTree, Ruler, Box, Settings,
  UserCog, Shield, Menu as MenuIcon, LogOut,
  GraduationCap, ClipboardList, ShoppingCart,
  FileText, BarChart3, CheckSquare, Layers
} from "lucide-react";

// Map menu routes to required privileges - MUST MATCH MODULE_TO_RESOURCE keys
const MENU_PRIVILEGES: Record<string, { module: string; action: 'read' | 'create' | 'update' | 'delete' }> = {
  '/dashboard': { module: 'Academic Sessions', action: 'read' }, // Academic Session menu is mapped to /dashboard route
  '/academic-sessions': { module: 'Academic Sessions', action: 'read' },
  '/brands': { module: 'Brands', action: 'read' },
  '/categories': { module: 'Categories', action: 'read' },
  '/sub-categories': { module: 'Sub Categories', action: 'read' },
  '/unit-of-measurements': { module: 'UOM', action: 'read' },
  '/inventory-items': { module: 'Inventory', action: 'read' },
  '/entitlements': { module: 'Entitlements', action: 'read' },
  '/suppliers': { module: 'Suppliers', action: 'read' },
  '/classes': { module: 'Classes', action: 'read' },
  '/teachers': { module: 'Teachers', action: 'read' },
  '/students': { module: 'Students', action: 'read' },
  '/supplier-transactions': { module: 'Supplier Transactions', action: 'read' },
  '/student-collections': { module: 'Student Inventory Collection', action: 'read' },
  '/distributions': { module: 'Distributions', action: 'read' },
  '/collection-summary': { module: 'Collection Summary', action: 'read' },
  '/collection-report': { module: 'Collection Report', action: 'read' },
  '/users': { module: 'Users', action: 'read' },
  '/roles': { module: 'Roles', action: 'read' },
  '/privileges': { module: 'Privileges', action: 'read' },
  '/menus': { module: 'Menus', action: 'read' },
  '/settings': { module: 'Settings', action: 'read' },
};

// Default developer menu items
const DEVELOPER_MENUS = [
  { id: 'dev-1', caption: 'Academic Session', route: '/dashboard', order: 1 },
  { id: 'dev-2', caption: 'Brands', route: '/brands', order: 2 },
  { id: 'dev-3', caption: 'Categories', route: '/categories', order: 3 },
  { id: 'dev-4', caption: 'Sub Categories', route: '/subCategories', order: 4 },
  { id: 'dev-5', caption: 'Units of Measure', route: '/uom', order: 5 },
  { id: 'dev-6', caption: 'Inventory Items', route: '/inventoryItem', order: 6 },
  { id: 'dev-7', caption: 'Inventory Entitlement', route: '/classInventoryEntitlment', order: 7 },
  { id: 'dev-8', caption: 'Suppliers', route: '/suppliers', order: 8 },
  { id: 'dev-9', caption: 'Users', route: '/user', order: 9 },
  { id: 'dev-10', caption: 'Classes', route: '/classes', order: 10 },
  { id: 'dev-11', caption: 'Class Teachers', route: '/classTeachers', order: 11 },
  { id: 'dev-12', caption: 'Purchase', route: '/transactionItem', order: 12 },
  { id: 'dev-13', caption: 'Students', route: '/students', order: 13 },
  { id: 'dev-14', caption: 'Student Collection', route: '/studentInventoryEntitlement', order: 14 },
  { id: 'dev-15', caption: 'Inventory Distributions', route: '/inventoryDistrbution', order: 15 },
  { id: 'dev-16', caption: 'Inventory Summary', route: '/inventorySummary', order: 16 },
  { id: 'dev-17', caption: 'Students Report', route: '/studentsReport', order: 17 },
  { id: 'dev-18', caption: 'Supplier Transaction', route: '/supplierTransaction', order: 18 },
  { id: 'dev-19', caption: 'Roles', route: '/roles', order: 19 },
  { id: 'dev-20', caption: 'Role Privileges', route: '/rolesPrivilage', order: 20 },
  { id: 'dev-21', caption: 'Menus', route: '/menu', order: 21 },
  { id: 'dev-22', caption: 'Role Menus', route: '/rolesMenu', order: 22 },
];

// Smart icon mapping based on menu caption
const getIconForMenu = (caption: string): React.ReactNode => {
  const lower = caption.toLowerCase();
  
  if (lower.includes("dashboard") || lower.includes("home")) return <Home className="w-5 h-5" />;
  if (lower.includes("academic") || lower.includes("session")) return <Calendar className="w-5 h-5" />;
  if (lower.includes("brand")) return <Building className="w-5 h-5" />;
  if (lower.includes("categories") && !lower.includes("sub")) return <FolderTree className="w-5 h-5" />;
  if (lower.includes("sub") && lower.includes("categor")) return <Layers className="w-5 h-5" />;
  if (lower.includes("unit") || lower.includes("measure") || lower.includes("uom")) return <Ruler className="w-5 h-5" />;
  if (lower.includes("inventoryitem") || (lower.includes("inventory") && lower.includes("item"))) return <Package className="w-5 h-5" />;
  if (lower.includes("entitle")) return <CheckSquare className="w-5 h-5" />;
  if (lower.includes("supplier") && !lower.includes("transaction")) return <Box className="w-5 h-5" />;
  if (lower.includes("user") && !lower.includes("role")) return <Users className="w-5 h-5" />;
  if (lower.includes("class") && !lower.includes("teacher")) return <GraduationCap className="w-5 h-5" />;
  if (lower.includes("teacher")) return <UserCog className="w-5 h-5" />;
  if (lower.includes("purchase") || lower.includes("transaction")) return <ShoppingCart className="w-5 h-5" />;
  if (lower.includes("student") && !lower.includes("collection") && !lower.includes("report")) return <Users className="w-5 h-5" />;
  if (lower.includes("collection")) return <ClipboardList className="w-5 h-5" />;
  if (lower.includes("distribution")) return <Package className="w-5 h-5" />;
  if (lower.includes("summary")) return <BarChart3 className="w-5 h-5" />;
  if (lower.includes("report")) return <FileText className="w-5 h-5" />;
  if (lower.includes("role") && !lower.includes("menu")) return <Shield className="w-5 h-5" />;
  if (lower.includes("privilege")) return <Shield className="w-5 h-5" />;
  if (lower.includes("menu")) return <MenuIcon className="w-5 h-5" />;
  if (lower.includes("setting")) return <Settings className="w-5 h-5" />;
  
  return <BookOpen className="w-5 h-5" />;
};

const VerticalNav = () => {
  const { user, menus, loading, logout, canPerformAction, isSuperAdmin } = useUser();
  const pathname = usePathname();

  // Filter menus based on privileges
  const authorizedMenus = React.useMemo(() => {
    // DEVELOPER MODE: If no menus from server, use default developer menus
    if (menus.length === 0) {
      console.log('🛠️ DEVELOPER MODE: No menus from server, showing all routes');
      return DEVELOPER_MENUS;
    }

    console.log('🔍 Filtering menus:', {
      totalMenus: menus.length,
      isSuperAdmin,
      menus: menus.map(m => ({ route: m.route, caption: m.caption }))
    });

    // Super admins see all menus
    if (isSuperAdmin) {
      console.log('🔑 Super admin - showing all menus');
      return menus;
    }

    // TEMPORARY FIX: Show all menus if no privilege mapping exists
    // This helps us see what menus the store keeper has
    const filtered = menus.filter(menu => {
      const privilege = MENU_PRIVILEGES[menu.route];
      
      // If no privilege requirement is defined, SHOW the menu (for debugging)
      if (!privilege) {
        console.warn(`⚠️ No privilege mapping for route: ${menu.route} (${menu.caption}) - SHOWING ANYWAY`);
        return true; // Changed to show unmapped menus
      }
      
      // Check if user has the required privilege
      const hasAccess = canPerformAction(privilege.module, privilege.action);
      
      console.log(`${hasAccess ? '✅' : '❌'} Menu "${menu.caption}" (${menu.route}):`, {
        requiredModule: privilege.module,
        requiredAction: privilege.action,
        hasAccess
      });
      
      return hasAccess;
    });

    console.log(`📋 Authorized menus: ${filtered.length}/${menus.length}`);
    
    // EMERGENCY FALLBACK: If no menus pass the filter, show all menus with a warning
    if (filtered.length === 0 && menus.length > 0) {
      console.error('🚨 NO MENUS AUTHORIZED - Showing all menus as fallback. CHECK YOUR PRIVILEGES CONFIGURATION!');
      return menus;
    }
    
    return filtered;
  }, [menus, canPerformAction, isSuperAdmin]);

  // Debug effect
  React.useEffect(() => {
    console.log('🎨 VerticalNav State:', {
      user: user?.email,
      roles: user?.roles,
      isSuperAdmin,
      totalMenus: menus.length,
      authorizedMenus: authorizedMenus.length,
      menus: menus.map(m => m.caption),
      authorized: authorizedMenus.map(m => m.caption)
    });
  }, [user, menus, authorizedMenus, isSuperAdmin]);

  if (loading) {
    return (
      <div className="w-64 h-screen bg-white flex items-center justify-center border-r border-gray-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="w-64 h-screen bg-white flex flex-col border-r border-gray-200">
      {/* Profile Section */}
      <div className="flex flex-col items-center py-6 border-b border-gray-200">
        <div className="w-16 h-16 relative mb-3">
          <Image
            src="/images/logo.png"
            alt="profile"
            fill
            className="rounded-full object-cover"
          />
        </div>
        <h3 className="font-semibold text-gray-800 text-lg tracking-tighter">
          {user?.name || "Guest"}
        </h3>
        <p className="text-sm text-gray-500">{user?.email}</p>
        {user?.roles && user.roles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 justify-center px-4">
            {user.roles.slice(0, 3).map((role) => (
              <span
                key={role}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                {role}
              </span>
            ))}
            {user.roles.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                +{user.roles.length - 3}
              </span>
            )}
          </div>
        )}
        {isSuperAdmin && (
          <span className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
            🔑 Super Admin
          </span>
        )}
      </div>

      {/* Scrollable Nav Links */}
      <nav className="flex-1 overflow-y-auto px-4 mt-6 scrollbar-none">
        {authorizedMenus.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <p className="mb-2">No menu items available</p>
            <p className="text-xs">Contact your administrator</p>
            <div className="mt-4 text-xs text-left bg-gray-50 p-3 rounded">
              <p className="font-semibold mb-1">Debug Info:</p>
              <p>Total menus: {menus.length}</p>
              <p>User roles: {user?.roles?.join(', ') || 'None'}</p>
              <p className="mt-2 text-red-600">Check browser console for details</p>
            </div>
          </div>
        ) : (
          <>
            {menus.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 font-semibold mb-1">🛠️ Developer Mode</p>
                <p className="text-xs text-yellow-700">Showing all routes (no server menus)</p>
              </div>
            )}
            <ul className="flex flex-col gap-1"> 
              {authorizedMenus.map((menu) => {
                const isActive = pathname === menu.route;
                return (
                  <li key={menu.id}>
                    <Link
                      href={menu.route}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-[#3D4C63] text-white shadow-sm"
                          : "hover:bg-[#F3F4F7] text-gray-700"
                      }`}
                      title={menu.caption}
                    >
                      {getIconForMenu(menu.caption)}
                      <span className="text-sm font-medium truncate">
                        {menu.caption}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Logout Button */}
      <div className="px-4 py-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>

      {/* Footer */}
      <div className="py-3 px-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">&copy; 2025 Kayron</p>
      </div>

      {/* Hide scrollbar */}
      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default VerticalNav;