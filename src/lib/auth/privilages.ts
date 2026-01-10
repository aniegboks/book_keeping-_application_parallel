/**
 * Privileges helper with Super Admin email bypass and case-insensitive resource matching
 */

export interface Privilege {
  description: string;
  status: 'active' | 'inactive' | boolean;
}

export interface UserPrivileges {
  [module: string]: Privilege[];
}

interface RolePrivilegesResponse {
  role_code: string;
  privileges: {
    [module: string]: Privilege[];
  };
}

/* -------------------------------------------------------------------------- */
/*                         SUPER ADMIN OVERRIDE HELPERS                        */
/* -------------------------------------------------------------------------- */

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "CHAIRMAN"];

const SUPER_ADMIN_EMAILS = (() => {
  if (typeof window === 'undefined') {
    return (process.env.SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  }
  return (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
})();

export function isSuperAdminByEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export function isSuperAdmin(roleCodes: string[]): boolean {
  return roleCodes.some((role) =>
    SUPER_ADMIN_ROLES.includes(role.toUpperCase())
  );
}

/* -------------------------------------------------------------------------- */
/*                       UI MODULE ➜ API RESOURCE MAPPING                     */
/* -------------------------------------------------------------------------- */

export const MODULE_TO_RESOURCE: Record<string, string> = {
  'Dashboard': 'dashboard',
  'Brands': 'brands',
  'Categories': 'categories',
  'Sub Categories': 'sub_categories',
  'UOM': 'uoms',
  'Unit of Measurements': 'uoms',
  'Academic Sessions': 'academic_session_terms',
  'Classes': 'school_classes',
  'Students': 'students',
  'Teachers': 'class_teachers',
  'Inventory': 'inventory_items',
  'Inventory Transactions': 'inventory_transactions',
  'Inventory Summary': 'inventory_summary',
  'Suppliers': 'suppliers',
  'Supplier Transactions': 'supplier_transactions',
  'Entitlements': 'class_inventory_entitlements',
  'StudentInventoryCollection': 'student_inventory_collection',
  'Student Inventory Collection': 'student_inventory_collection',
  'Distributions': 'inventory_transactions',
  'Collection Summary': 'inventory_summary',
  'Collection Report': 'inventory_summary',
  'Users': 'users',
  'Roles': 'roles',
  'RoleMenus': 'role_menus',
  'Student Inventory Report': 'student_inventory_report',
  'Role Menus': 'role_menus',
  'Privileges': 'role_privileges',
  'RolePrivileges': 'role_privileges',
  'Menus': 'menus',
  'Settings': 'settings',
};

const ACTION_PATTERNS: Record<string, string[]> = {
  'read': ['Get all', 'Get a', 'Get an'],
  'get': ['Get all', 'Get a', 'Get an'],
  'create': ['Create a new', 'Create an'],
  'update': ['Update a', 'Update an'],
  'delete': ['Delete a', 'Delete an'],
};

/* -------------------------------------------------------------------------- */
/*                            UTILITY FUNCTIONS                               */
/* -------------------------------------------------------------------------- */

export function getResourceKey(moduleName: string): string {
  return MODULE_TO_RESOURCE[moduleName] || moduleName.toLowerCase().replace(/ /g, '_');
}

/**
 * Find matching privilege module key (case-insensitive)
 * The API returns keys in UPPERCASE (e.g., BRANDS, CATEGORIES)
 * but we need to match them with our lowercase resource keys
 */
function findPrivilegeModule(privileges: UserPrivileges, resourceKey: string): Privilege[] | undefined {
  // First try exact match
  if (privileges[resourceKey]) {
    return privileges[resourceKey];
  }

  // Try case-insensitive match
  const upperKey = resourceKey.toUpperCase();
  if (privileges[upperKey]) {
    return privileges[upperKey];
  }

  // Try all variations
  const lowerKey = resourceKey.toLowerCase();
  for (const key in privileges) {
    if (key.toLowerCase() === lowerKey) {
      return privileges[key];
    }
  }

  return undefined;
}

/* -------------------------------------------------------------------------- */
/*                     FETCH PRIVILEGES FOR A SINGLE ROLE                     */
/* -------------------------------------------------------------------------- */

async function fetchRolePrivileges(roleCode: string): Promise<UserPrivileges> {
  try {
    const response = await fetch(
      `/api/proxy/role_privileges?role_code=${roleCode}`,
      { headers: { 'accept': 'application/json' } }
    );

    if (!response.ok) {
      console.warn(`⚠️ No privileges found for role: ${roleCode}`);
      return {};
    }

    const data: RolePrivilegesResponse = await response.json();
    
    // Normalize the privileges - convert boolean status to string
    const normalizedPrivileges: UserPrivileges = {};
    
    if (data.privileges) {
      Object.keys(data.privileges).forEach((module) => {
        normalizedPrivileges[module] = data.privileges[module].map((priv) => ({
          description: priv.description,
          status: priv.status === true || priv.status === 'active' ? 'active' : 'inactive'
        }));
      });
    }
    
    return normalizedPrivileges;
  } catch (error) {
    console.error(`❌ Failed to fetch privileges for role ${roleCode}:`, error);
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/*                   MERGE PRIVILEGES ACROSS MULTIPLE ROLES                  */
/* -------------------------------------------------------------------------- */

function mergePrivileges(existing: Privilege[], incoming: Privilege[]): Privilege[] {
  const merged = [...existing];

  incoming.forEach((p) => {
    const index = merged.findIndex((e) => e.description === p.description);
    const isActive = p.status === true || p.status === 'active';
    
    if (index >= 0) {
      if (isActive) merged[index].status = 'active';
    } else {
      merged.push({
        description: p.description,
        status: isActive ? 'active' : 'inactive'
      });
    }
  });

  return merged;
}

/* -------------------------------------------------------------------------- */
/*       FETCH PRIVILEGES FOR ALL USER ROLES (WITH SUPER ADMIN OVERRIDE)     */
/* -------------------------------------------------------------------------- */

export async function fetchUserPrivilegesForRoles(
  roleCodes: string[],
  userEmail?: string
): Promise<UserPrivileges> {

  // SUPER ADMIN EMAIL BYPASS - MOST IMPORTANT
  if (userEmail && isSuperAdminByEmail(userEmail)) {
    console.log(`🔑 Super admin email detected: ${userEmail} - granting full access`);
    return {
      "*": [{ description: "ALL_PRIVILEGES", status: "active" }]
    };
  }

  // SUPER ADMIN ROLE → GIVE ALL ACCESS
  if (isSuperAdmin(roleCodes)) {
    console.log(`🔑 Super admin role detected - granting full access`);
    return {
      "*": [{ description: "ALL_PRIVILEGES", status: "active" }]
    };
  }

  try {
    const privilegesPromises = roleCodes.map((roleCode) =>
      fetchRolePrivileges(roleCode)
    );

    const privilegesArray = await Promise.all(privilegesPromises);

    const mergedPrivileges: UserPrivileges = {};

    privilegesArray.forEach((rolePrivs) => {
      Object.keys(rolePrivs).forEach((module) => {
        mergedPrivileges[module] = mergedPrivileges[module]
          ? mergePrivileges(mergedPrivileges[module], rolePrivs[module])
          : rolePrivs[module];
      });
    });

    console.log('✅ Merged privileges:', {
      modules: Object.keys(mergedPrivileges),
      total: Object.values(mergedPrivileges).reduce((sum, privs) => sum + privs.length, 0)
    });

    return mergedPrivileges;
  } catch (error) {
    console.error('Failed to fetch user privileges:', error);
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/*                                CHECKERS                                    */
/* -------------------------------------------------------------------------- */

export function hasPrivilege(
  privileges: UserPrivileges,
  privilegeDescription: string,
  module?: string
): boolean {
  if (!privileges) return false;

  if (privileges["*"]) return true; // SUPER ADMIN

  if (module) {
    const resourceKey = getResourceKey(module);
    const modulePrivileges = findPrivilegeModule(privileges, resourceKey);
    
    if (!modulePrivileges) {
      console.warn(`⚠️ No privileges found for module: ${module} (resource: ${resourceKey})`);
      return false;
    }

    return modulePrivileges.some(
      (priv) => {
        const isActive = priv.status === true || priv.status === 'active';
        return priv.description.toLowerCase().includes(privilegeDescription.toLowerCase()) && isActive;
      }
    );
  }

  return Object.values(privileges).some((privs) =>
    privs.some(
      (priv) => {
        const isActive = priv.status === true || priv.status === 'active';
        return priv.description.toLowerCase().includes(privilegeDescription.toLowerCase()) && isActive;
      }
    )
  );
}

/* -------------------------------------------------------------------------- */
/*                     CAN USER PERFORM ACTION? (MAIN CHECK)                 */
/* -------------------------------------------------------------------------- */

export function canPerformAction(
  privileges: UserPrivileges,
  moduleName: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'get'
): boolean {
  if (!privileges) {
    console.warn(`⚠️ No privileges object provided for ${moduleName} -> ${action}`);
    return false;
  }

  if (privileges["*"]) return true; // SUPER ADMIN

  const resourceKey = getResourceKey(moduleName);
  const modulePrivileges = findPrivilegeModule(privileges, resourceKey);

  if (!modulePrivileges) {
    console.warn(`⚠️ No privileges found for module: ${moduleName} (resource: ${resourceKey})`);
    console.log('Available privilege modules:', Object.keys(privileges));
    return false;
  }

  const patterns = ACTION_PATTERNS[action.toLowerCase()];
  if (!patterns) {
    console.warn(`⚠️ Unknown action: ${action}`);
    return false;
  }

  console.log(`🔍 Checking ${moduleName} -> ${action}`, {
    resourceKey,
    patterns,
    privilegeCount: modulePrivileges.length
  });

  const allowed = modulePrivileges.some((priv) => {
    const isActive = priv.status === true || priv.status === 'active';
    const matches = patterns.some((pattern) => {
      const trimmedDesc = priv.description.trim();
      const startsWithPattern = trimmedDesc.startsWith(pattern);
      
      console.log(`  📝 Checking privilege:`, {
        description: priv.description,
        trimmed: trimmedDesc,
        pattern,
        startsWith: startsWithPattern,
        isActive,
        status: priv.status
      });
      
      return startsWithPattern;
    });
    
    if (matches && isActive) {
      console.log(`✅ Permission granted: ${moduleName} -> ${action} (matched: "${priv.description}")`);
    }
    
    return matches && isActive;
  });

  if (!allowed) {
    console.warn(`❌ Permission denied: ${moduleName} -> ${action}`);
    console.log(`Available privileges for ${moduleName}:`, modulePrivileges.map(p => ({
      description: p.description,
      status: p.status,
      active: p.status === true || p.status === 'active'
    })));
  }

  return allowed;
}

/* -------------------------------------------------------------------------- */
/*                              MODULE HELPERS                                */
/* -------------------------------------------------------------------------- */

export function getModulePrivileges(
  privileges: UserPrivileges,
  moduleName: string
): Privilege[] {
  if (privileges["*"]) return [{ description: "ALL_PRIVILEGES", status: "active" }];

  const resourceKey = getResourceKey(moduleName);
  const modulePrivileges = findPrivilegeModule(privileges, resourceKey);
  
  return modulePrivileges?.filter((p) => {
    const isActive = p.status === true || p.status === 'active';
    return isActive;
  }).map(p => ({
    description: p.description,
    status: 'active' as const
  })) || [];
}

export function hasAnyPrivilegeInModule(
  privileges: UserPrivileges,
  moduleName: string
): boolean {
  if (privileges["*"]) return true;

  const resourceKey = getResourceKey(moduleName);
  const modulePrivileges = findPrivilegeModule(privileges, resourceKey);

  if (!modulePrivileges) return false;

  return modulePrivileges.some((priv) => {
    const isActive = priv.status === true || priv.status === 'active';
    return isActive;
  });
}

export function getAccessibleModules(privileges: UserPrivileges): string[] {
  if (privileges["*"]) return ["*"];

  return Object.keys(privileges).filter((module) =>
    privileges[module].some((priv) => {
      const isActive = priv.status === true || priv.status === 'active';
      return isActive;
    })
  );
}