"use client";

import React, { createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

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
  const liveSettings = useQuery(api.settings.getContactSettings);
  const source = liveSettings ?? settings;
  const phone = source?.phoneNumber || defaultContactSettings.phoneNumber;

  const value: ContactSettings = {
    phoneNumber: phone,
    whatsappNumber: phone,
    email: source?.email || defaultContactSettings.email,
    workingHours: source?.workingHours || defaultContactSettings.workingHours,
    address: source?.address || defaultContactSettings.address,
    city: source?.city || defaultContactSettings.city,
    district: source?.district || defaultContactSettings.district,
    postalCode: source?.postalCode || defaultContactSettings.postalCode,
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
