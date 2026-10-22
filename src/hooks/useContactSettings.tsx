"use client";

import React, { createContext, useContext } from "react";

export interface ContactSettings {
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  workingHours: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
}

const defaultContactSettings: ContactSettings = {
  phoneNumber: "",
  whatsappNumber: "",
  email: "",
  workingHours: "",
  address: "",
  city: "",
  district: "",
  postalCode: "",
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
    city: settings?.city || defaultContactSettings.city,
    district: settings?.district || defaultContactSettings.district,
    postalCode: settings?.postalCode || defaultContactSettings.postalCode,
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
