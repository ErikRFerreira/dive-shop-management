import { PreferredLanguage } from '@/generated/prisma/enums';

export type CustomerSearchResult = {
  id: string;
  name: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  chineseName: string | null;
  preferredLanguage: PreferredLanguage | null;
  certificationLevel: string | null;
  certificationAgency: string | null;
  lastDiveDate: Date | null;
  divesLogged: number | null;
  email: string | null;
  phone: string | null;
  weChatId: string | null;
  whatsAppNumber: string | null;
  lastBookingDate: Date | null;
};

export type DuplicateCustomerMatchField =
  | 'weChatId'
  | 'whatsAppNumber'
  | 'email'
  | 'phone'
  | 'nameAndChineseName';

export type PotentialDuplicateCustomerInput = {
  excludeCustomerId?: string | null;
  name?: string | null;
  chineseName?: string | null;
  weChatId?: string | null;
  whatsAppNumber?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type PotentialDuplicateCustomer = CustomerSearchResult & {
  matchedFields: DuplicateCustomerMatchField[];
};
