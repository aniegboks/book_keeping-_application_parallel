"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { fetchUserPrivilegesForRoles, hasPrivilege, canPerformAction, UserPrivileges, isSuperAdminByEmail } from "@/lib/auth/privilages";

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  teacher_id?: string | null;
}

interface Menu {
  id: string;
  route: string;
  caption: string;
  created_at: string;
  updated_at: string;
}

interface RoleMenuResponse {
  menu: Menu;
}

interface UserContextType {
  user: User | null;
  menus: Menu[];
  privileges: UserPrivileges;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPrivilege: (privilege: string, module?: string) => boolean;
  canPerformAction: (module: string, action: 'create' | 'read' | 'update' | 'delete' | 'get') => boolean;
  isSuperAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [privileges, setPrivileges] = useState<UserPrivileges>({});
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  // Map Supabase roles to backend role codes
  const mapRoleToBackendCode = (role: string): string => {
    const roleMap: Record<string, string> = {
      'admin': 'ADMIN',
      'super-admin': 'SUPER_ADMIN',
      'editor': 'ADMIN',
      'teacher': 'CLASS_TEACHER',
      'user': 'STUDENTS',
      'store-keeper': 'STORE_KEEPER',
      'storekeeper': 'STORE_KEEPER',
      'store_keeper': 'STORE_KEEPER',
    };
    
    const mapped = roleMap[role.toLowerCase()] || role.toUpperCase();
    console.log(`🔄 Role mapping: "${role}" → "${mapped}"`);
    return mapped;
  };

  const fetchMenus = useCallback(async (roles: string[]) => {
    try {
      const backendRoles = roles.map(mapRoleToBackendCode);
      console.log('📋 Fetching menus for roles:', { 
        original: roles, 
        backend: backendRoles 
      });

      const menusPromises = backendRoles.map(async (roleCode: string) => {
        try {
          const url = `/api/proxy/role_menus/role/${roleCode}`;
          console.log(`📡 Fetching menus from: ${url}`);
          
          const res = await fetch(url);
          
          console.log(`📡 Response for ${roleCode}:`, {
            status: res.status,
            ok: res.ok
          });
          
          if (res.ok) {
            const data: RoleMenuResponse[] = await res.json();
            console.log(`✅ Menus received for ${roleCode}:`, data);
            return data.map((item) => item.menu);
          }
          
          console.warn(`⚠️ No menus found for role: ${roleCode} (Status: ${res.status})`);
          return [];
        } catch (error) {
          console.error(`❌ Failed to fetch menus for role ${roleCode}:`, error);
          return [];
        }
      });

      const menusArrays = await Promise.all(menusPromises);
      console.log('📋 All menus arrays:', menusArrays);
      
      const allMenus = menusArrays.flat();
      console.log('📋 Flattened menus:', allMenus);

      const uniqueMenus = Array.from(
        new Map(allMenus.map((menu) => [menu.id, menu])).values()
      );

      uniqueMenus.sort((a, b) => 
        a.caption.localeCompare(b.caption)
      );

      console.log(`✅ Final unique menus (${uniqueMenus.length}):`, uniqueMenus);
      setMenus(uniqueMenus);
    } catch (error) {
      console.error("❌ Failed to fetch menus:", error);
      setMenus([]);
    }
  }, []);

  // Fetch user privileges with email-based super admin check
  const fetchPrivileges = useCallback(async (roles: string[], email: string) => {
    try {
      // Check if user is super admin by email FIRST
      const isSuperAdminEmail = isSuperAdminByEmail(email);
      setIsSuperAdmin(isSuperAdminEmail);

      if (isSuperAdminEmail) {
        console.log(`🔑 Super admin email detected: ${email} - granting full access`);
        setPrivileges({
          "*": [{ description: "ALL_PRIVILEGES", status: "active" }]
        });
        return;
      }

      const backendRoles = roles.map(mapRoleToBackendCode);
      console.log('🔐 Fetching privileges for roles:', backendRoles);

      const userPrivileges = await fetchUserPrivilegesForRoles(backendRoles, email);
      
      const privilegeCount = Object.values(userPrivileges).reduce(
        (sum, privs) => sum + privs.length, 
        0
      );
      
      console.log(`✅ Loaded ${privilegeCount} privileges across ${Object.keys(userPrivileges).length} modules`);
      console.log('🔐 Privileges detail:', userPrivileges);
      setPrivileges(userPrivileges);
    } catch (error) {
      console.error("❌ Failed to fetch privileges:", error);
      setPrivileges({});
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      console.log('👤 Fetching user data...');
      const res = await fetch("/api/proxy/auth/test");
      
      if (res.ok) {
        const data = await res.json();
        console.log('👤 User data received:', data.user);
        setUser(data.user);
        
        if (data.user?.email) {
          // Check super admin FIRST before any privilege fetching
          const isSuperAdminEmail = isSuperAdminByEmail(data.user.email);
          console.log(`🔐 Super admin check for ${data.user.email}:`, isSuperAdminEmail);
          
          if (isSuperAdminEmail) {
            console.log('🔑 SUPER ADMIN DETECTED - Granting full access');
            setIsSuperAdmin(true);
            setPrivileges({
              "*": [{ description: "ALL_PRIVILEGES", status: "active" }]
            });
            setMenus([]); // Super admin gets all menus by default
            return; // Skip role-based privilege fetching
          }
        }
        
        if (data.user?.roles && data.user.roles.length > 0 && data.user?.email) {
          console.log('📋 User roles:', data.user.roles);
          // Fetch both menus and privileges (passing email for super admin check)
          await Promise.all([
            fetchMenus(data.user.roles),
            fetchPrivileges(data.user.roles, data.user.email)
          ]);
        } else {
          console.warn('⚠️ No roles found for user');
          setMenus([]);
          setPrivileges({});
          setIsSuperAdmin(false);
        }
      } else {
        console.error('❌ Auth test failed:', res.status);
        setUser(null);
        setMenus([]);
        setPrivileges({});
        setIsSuperAdmin(false);
      }
    } catch (error) {
      console.error("❌ Failed to fetch user:", error);
      setUser(null);
      setMenus([]);
      setPrivileges({});
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [fetchMenus, fetchPrivileges]);

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      setUser(null);
      setMenus([]);
      setPrivileges({});
      setIsSuperAdmin(false);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  // Helper functions for privilege checking
  const checkPrivilege = useCallback((privilege: string, module?: string) => {
    return hasPrivilege(privileges, privilege, module);
  }, [privileges]);

  const checkAction = useCallback((module: string, action: 'create' | 'read' | 'update' | 'delete' | 'get') => {
    return canPerformAction(privileges, module, action);
  }, [privileges]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Debug effect to log menu changes
  useEffect(() => {
    console.log('📋 MENUS UPDATED:', {
      count: menus.length,
      menus: menus.map(m => ({ caption: m.caption, route: m.route }))
    });
  }, [menus]);

  return (
    <UserContext.Provider value={{ 
      user, 
      menus, 
      privileges,
      loading, 
      logout, 
      refreshUser: fetchUser,
      hasPrivilege: checkPrivilege,
      canPerformAction: checkAction,
      isSuperAdmin
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}