"use client";

import { useUser } from "@/contexts/UserContext";
import { useEffect, useState } from "react";
import { Bug, ChevronDown, ChevronUp, X } from "lucide-react";

export default function DebugPanel() {
  const { user, privileges, isSuperAdmin } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [envCheck, setEnvCheck] = useState<{server: string[], client: string[]}>({
    server: [],
    client: []
  });

  useEffect(() => {
    // Check client-side env vars
    const clientEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim());
    setEnvCheck(prev => ({ ...prev, client: clientEmails }));

    // Fetch server-side env check
    fetch('/api/debug/env')
      .then(res => res.json())
      .then(data => setEnvCheck(prev => ({ ...prev, server: data.emails || [] })))
      .catch(() => {});
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <>
      {/* Floating Debug Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-[#3D4C63] text-white p-3 rounded-full shadow-lg hover:bg-[#495C79] transition-all z-50 flex items-center gap-2"
          title="Open Debug Panel"
        >
          <Bug className="w-5 h-5" />
        </button>
      )}

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 bg-white text-black border-2 border-[#3D4C63] rounded-lg shadow-2xl max-w-2xl max-h-[80vh] overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="bg-[#3D4C63] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              <h3 className="font-bold text-sm">Debug Panel</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-4 text-xs font-mono">
            <div className="space-y-3">
              {/* User Info */}
              <div className="border-b border-gray-200 pb-3">
                <div className="font-bold text-[#3D4C63] mb-2">👤 USER INFORMATION</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold">{user?.email || 'Not logged in'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-semibold">{user?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold">{user?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div className="border-b border-gray-200 pb-3">
                <div className="font-bold text-[#3D4C63] mb-2">🎭 ROLES</div>
                {user?.roles && user.roles.length > 0 ? (
                  <div className="space-y-1">
                    {user.roles.map((role, idx) => (
                      <div key={idx} className="bg-blue-50 px-2 py-1 rounded text-blue-800">
                        {role}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No roles assigned</div>
                )}
              </div>

              {/* Super Admin Status */}
              <div className="border-b border-gray-200 pb-3">
                <div className="font-bold text-[#3D4C63] mb-2">🔑 SUPER ADMIN STATUS</div>
                <div className={`px-3 py-2 rounded font-bold ${
                  isSuperAdmin 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {isSuperAdmin ? '✅ YES - FULL ACCESS GRANTED' : '❌ NO - LIMITED ACCESS'}
                </div>
              </div>

              {/* Privileges Summary */}
              <div className="border-b border-gray-200 pb-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-bold text-[#3D4C63]">🛡️ PRIVILEGES</div>
                  {!privileges['*'] && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                    </button>
                  )}
                </div>
                
                {privileges['*'] ? (
                  <div className="bg-yellow-50 px-3 py-2 rounded border-2 border-yellow-300">
                    <div className="font-bold text-yellow-800">🔑 ALL PRIVILEGES</div>
                    <div className="text-xs text-yellow-700 mt-1">Full system access granted</div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 px-3 py-2 rounded mb-2">
                      <span className="font-semibold">{Object.keys(privileges).length}</span> modules accessible
                    </div>
                    
                    {isExpanded && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Object.keys(privileges).length === 0 ? (
                          <div className="text-gray-500 italic">No privileges assigned</div>
                        ) : (
                          Object.entries(privileges).map(([module, privs]) => (
                            <div key={module} className="border border-gray-200 rounded p-2">
                              <div className="font-semibold text-[#3D4C63] mb-1">
                                {module.replace(/_/g, ' ').toUpperCase()}
                              </div>
                              <div className="space-y-1 pl-2">
                                {privs.map((priv, idx) => (
                                  <div 
                                    key={idx}
                                    className={`text-xs flex items-center gap-1 ${
                                      priv.status === 'active' || priv.status === true
                                        ? 'text-green-700' 
                                        : 'text-gray-400 line-through'
                                    }`}
                                  >
                                    <span className="w-1 h-1 rounded-full bg-current"></span>
                                    {priv.description}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Environment Variables */}
              <div className="border-b border-gray-200 pb-3">
                <div className="font-bold text-[#3D4C63] mb-2">⚙️ ENVIRONMENT</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-gray-600 mb-1">Client-side:</div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      envCheck.client.length > 0 && envCheck.client[0] 
                        ? 'bg-green-50 text-green-800' 
                        : 'bg-red-50 text-red-800'
                    }`}>
                      {envCheck.client.length > 0 && envCheck.client[0]
                        ? envCheck.client.join(', ') 
                        : '❌ NOT SET'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Server-side:</div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      envCheck.server.length > 0 && envCheck.server[0]
                        ? 'bg-green-50 text-green-800' 
                        : 'bg-red-50 text-red-800'
                    }`}>
                      {envCheck.server.length > 0 && envCheck.server[0]
                        ? envCheck.server.join(', ') 
                        : '❌ NOT SET'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-xs text-gray-500 italic text-center pt-2">
                Development mode only - Hidden in production
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}