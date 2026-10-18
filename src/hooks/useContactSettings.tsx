"use client";

import React, { createContext, useContext } from "react";
import { SITE_CONTACT } from "@/config/site";

export interface ContactSettings {
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  workingHours: string;
  address: string;
}

const defaultContactSettings: ContactSettings = {
  phoneNumber: SITE_CONTACT.phoneNumber,
  whatsappNumber: SITE_CONTACT.phoneNumber,
  email: SITE_CONTACT.email,
  workingHours: SITE_CONTACT.workingHours,
  address: SITE_CONTACT.address,
};

const ContactSettingsContext = createContext<ContactSettings>(defaultContactSettings);

export function ContactSettingsProvider({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings?: Partial<ContactSettings>;
}) {
  const phone = settings?.phoneNumber || defaultContactSettings.phoneNumber;

  const value: ContactSettings = {
    phoneNumber: phone,
    whatsappNumber: phone,
    email: settings?.email || defaultContactSettings.email,
    workingHours: settings?.workingHours || defaultContactSettings.workingHours,
    address: settings?.address || defaultContactSettings.address,
  };

  return (
    <ContactSettingsContext.Provider value={value}>
      {children}
    </ContactSettingsContext.Provider>
  );
}

export function useContactSettings(): ContactSettings {
  return useContext(ContactSettingsContext);
}
