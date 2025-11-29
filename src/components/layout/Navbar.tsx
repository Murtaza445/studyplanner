"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";

export const Navbar: React.FC = () => {
  const { data: session } = useSession();

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      {session?.user && (
        <div className="flex items-center gap-3">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || "User"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {session.user.name}
            </span>
            <span className="text-xs text-gray-500">{session.user.email}</span>
          </div>
        </div>
      )}
    </div>
  );
};

